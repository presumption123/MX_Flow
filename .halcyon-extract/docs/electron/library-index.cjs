const { load } = require('./bytecode-loader.cjs');
module.exports = load('./library-index.jsc', 'module');
