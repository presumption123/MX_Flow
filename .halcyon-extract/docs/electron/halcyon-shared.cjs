const { load } = require('./bytecode-loader.cjs');
module.exports = load('./halcyon-shared.jsc', 'module');
