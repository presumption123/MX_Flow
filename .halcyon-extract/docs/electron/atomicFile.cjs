const { load } = require('./bytecode-loader.cjs');
module.exports = load('./atomicFile.jsc', 'module');
