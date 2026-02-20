const chalk = require('chalk'); // Optional: run `npm install chalk@4` for colors, or remove chalk wrappers if you don't want it.

const getTimestamp = () => {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
};

const logger = {
    info: (message) => console.log(`[${getTimestamp()}] [INFO] ${message}`),
    success: (message) => console.log(`[${getTimestamp()}] [SUCCESS] ${message}`),
    warn: (message) => console.warn(`[${getTimestamp()}] [WARN] ${message}`),
    error: (message, error = '') => console.error(`[${getTimestamp()}] [ERROR] ${message}`, error),
    debug: (message) => {
        if (process.env.DEBUG === 'true') {
            console.log(`[${getTimestamp()}] [DEBUG] ${message}`);
        }
    }
};

module.exports = logger;
