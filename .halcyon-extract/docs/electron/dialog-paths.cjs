const { load } = require('./bytecode-loader.cjs');
module.exports = load('./dialog-paths.jsc', 'module');
