const { load } = require('./bytecode-loader.cjs');
module.exports = load('./cardshareCrypto.jsc', 'module');
