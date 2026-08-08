const { load } = require('./bytecode-loader.cjs');
module.exports = load('./readTolerant.jsc', 'module');
