const { load } = require('./bytecode-loader.cjs');
module.exports = load('./clipboard-reliable.jsc', 'module');
