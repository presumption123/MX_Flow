const { load } = require('./bytecode-loader.cjs');
module.exports = load('./gmail.jsc', 'module');
