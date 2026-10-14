const os = require('os')
const path = require('path')

module.exports = {
  STATE_FILE: path.join(os.tmpdir(), 'urbanfix-pgtest.json'),
  TEMPLATE_DB: 'urbanfix_template',
}
