const { load } = require('./bytecode-loader.cjs');
module.exports = load('./argv.jsc', 'module');
