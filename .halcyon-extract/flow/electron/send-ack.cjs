const { load } = require('./bytecode-loader.cjs');
module.exports = load('./send-ack.jsc', 'module');
