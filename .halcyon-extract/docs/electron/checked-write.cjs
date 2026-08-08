const { load } = require('./bytecode-loader.cjs');
module.exports = load('./checked-write.jsc', 'module');
