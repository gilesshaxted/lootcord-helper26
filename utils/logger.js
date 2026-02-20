const colors = {
    info: '\x1b[36m%s\x1b[0m', // Cyan
    warn: '\x1b[33m%s\x1b[0m', // Yellow
    error: '\x1b[31m%s\x1b[0m' // Red
};

module.exports = {
    info: (msg) => console.log(colors.info, `[INFO] ${new Date().toLocaleTimeString()}: ${msg}`),
    warn: (msg) => console.warn(colors.warn, `[WARN] ${new Date().toLocaleTimeString()}: ${msg}`),
    error: (msg, error) => {
        console.error(colors.error, `[ERROR] ${new Date().toLocaleTimeString()}: ${msg}`);
        if (error) console.error(error);
    }
};
