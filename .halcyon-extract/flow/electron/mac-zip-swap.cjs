const { load } = require('./bytecode-loader.cjs');
module.exports = load('./mac-zip-swap.jsc', 'module');
