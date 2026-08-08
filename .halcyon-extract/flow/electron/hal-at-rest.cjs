const { load } = require('./bytecode-loader.cjs');
module.exports = load('./hal-at-rest.jsc', 'module');
