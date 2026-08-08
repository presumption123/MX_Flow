const { load } = require('./bytecode-loader.cjs');
module.exports = load('./flow-recovery.jsc', 'module');
