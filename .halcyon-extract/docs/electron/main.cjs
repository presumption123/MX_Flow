const { load } = require('./bytecode-loader.cjs');
module.exports = load('./main.jsc', 'main');
