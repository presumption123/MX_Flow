const { load } = require('./bytecode-loader.cjs');
module.exports = load('./hal-connect.jsc', 'module');
