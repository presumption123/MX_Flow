const { load } = require('./bytecode-loader.cjs');
module.exports = load('./auto-update.jsc', 'module');
