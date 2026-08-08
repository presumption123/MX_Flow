const { load } = require('./bytecode-loader.cjs');
module.exports = load('./crash-log.jsc', 'module');
