const fs = require('fs')
const { STATE_FILE } = require('./constants')

module.exports = async () => {
  const pg = globalThis.__URBANFIX_PG__
  if (pg) await pg.stop()
  try {
    const { dir } = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    fs.rmSync(dir, { recursive: true, force: true })
    fs.rmSync(STATE_FILE, { force: true })
  } catch {}
}
