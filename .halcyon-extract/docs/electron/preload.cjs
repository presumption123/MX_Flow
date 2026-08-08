const { load } = require('./bytecode-loader.cjs');
module.exports = load('./preload.jsc', 'preload');
