const { load } = require('./bytecode-loader.cjs');
module.exports = load('./flow-connect-server.jsc', 'module');
