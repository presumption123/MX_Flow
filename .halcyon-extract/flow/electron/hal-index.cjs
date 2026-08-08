const { load } = require('./bytecode-loader.cjs');
module.exports = load('./hal-index.jsc', 'module');
