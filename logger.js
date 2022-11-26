const pino = require('pino');
const pinoCaller = require('pino-caller');

const loggerBase = pino({
        sync: true,
        level: 'info',
        transport: {
            target: 'pino-pretty'
        }
    },
    pino.destination({ sync: true }, 'logs/server-log')
);

const logger = pinoCaller(loggerBase);

module.exports = logger