const { load } = require('./bytecode-loader.cjs');
module.exports = load('./certPin.jsc', 'module');
