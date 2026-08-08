const { load } = require('./bytecode-loader.cjs');
module.exports = load('./superflow-ipc.jsc', 'module');
