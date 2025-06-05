export function log(...args) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}]`, ...args);
}
//# sourceMappingURL=logger.js.map