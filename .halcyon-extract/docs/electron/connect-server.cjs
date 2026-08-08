const { load } = require('./bytecode-loader.cjs');
module.exports = load('./connect-server.jsc', 'module');
