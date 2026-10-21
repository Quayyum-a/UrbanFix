// Starts a throwaway Postgres for the database tests and builds a template
// database containing the Supabase shim + the real urbanfix.sql.
const fs = require('fs')
const os = require('os')
const path = require('path')
const { Client } = require('pg')

const ROOT = path.resolve(__dirname, '..', '..')
const { STATE_FILE, TEMPLATE_DB } = require('./constants')

function ensureExecutable() {
  const binDir = path.join(ROOT, 'node_modules', '@embedded-postgres', `${process.platform}-${process.arch}`, 'native', 'bin')
  if (!fs.existsSync(binDir)) return
  for (const f of fs.readdirSync(binDir)) {
    try { fs.chmodSync(path.join(binDir, f), 0o755) } catch {}
  }
}

async function start() {
  ensureExecutable()
  const { default: EmbeddedPostgres } = await import('embedded-postgres')
  const port = 55000 + Math.floor(Math.random() * 5000)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'urbanfix-pg-'))
  fs.chmodSync(dir, 0o777)
  const pg = new EmbeddedPostgres({
    databaseDir: path.join(dir, 'data'),
    user: 'postgres',
    password: 'postgres',
    port,
    persistent: false,
    initdbFlags: ['--encoding=UTF8', '--locale=C.UTF-8'],
    onLog: () => {},
    onError: () => {},
    // Postgres refuses to run as root; embedded-postgres can create a user for it.
    createPostgresUser: typeof process.getuid === 'function' && process.getuid() === 0,
  })
  await pg.initialise()
  await pg.start()

  const admin = new Client({ host: 'localhost', port, user: 'postgres', password: 'postgres', database: 'postgres' })
  await admin.connect()
  await admin.query(`CREATE DATABASE ${TEMPLATE_DB}`)
  await admin.end()

  const c = new Client({ host: 'localhost', port, user: 'postgres', password: 'postgres', database: TEMPLATE_DB })
  await c.connect()
  await c.query(fs.readFileSync(path.join(__dirname, 'supabase-shim.sql'), 'utf8'))
  await c.query(fs.readFileSync(path.join(ROOT, 'database', 'urbanfix.sql'), 'utf8'))
  // Then every migration, in order, exactly as they're run in the SQL editor.
  const migrations = path.join(ROOT, 'database', 'migrations')
  for (const f of fs.readdirSync(migrations).filter((n) => n.endsWith('.sql')).sort()) {
    await c.query(fs.readFileSync(path.join(migrations, f), 'utf8'))
  }
  await c.end()

  fs.writeFileSync(STATE_FILE, JSON.stringify({ port, dir }))
  return { pg, port, dir }
}

module.exports = { start, STATE_FILE, TEMPLATE_DB }
