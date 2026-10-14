const { start } = require('./server')

module.exports = async () => {
  const { pg } = await start()
  globalThis.__URBANFIX_PG__ = pg
}
