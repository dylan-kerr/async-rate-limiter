module.exports = function rateMonitor(asyncFunction) {
    let maxConcurrency = 0;
    let concurrency = 0;
    function start() {
        concurrency++;
        if (concurrency > maxConcurrency) {
            maxConcurrency = concurrency;
        }
    }
    function end() {
        concurrency--;
    }

    const wrapperFunction = async function (...args) {
        start();
        try {
            return await asyncFunction(...args);
        } finally {
            end();
        }
    };
    Object.defineProperty(wrapperFunction, 'maxConcurrency', { get: () => maxConcurrency });
    return wrapperFunction;
};
