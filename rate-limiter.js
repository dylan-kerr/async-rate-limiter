function Deferred() {
    this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
    });
}

module.exports = function configureRateLimiter(options) {
    if (typeof options === 'number') {
        options = { concurrencyLimit: options };
    }
    const { concurrencyLimit, queueLimit, queueTimeout } = options;

    let maxConcurrency = 0;
    let concurrency = 0;
    const queue = [];
    function setQueueTimeout(deferred) {
        if (queueTimeout !== undefined) {
            setTimeout(
                () => {
                    const index = queue.indexOf(deferred);
                    if (index !== -1) {
                        queue.splice(index, 1);
                    }
                    deferred.reject(new Error(`Request timed-out in queue after ${queueTimeout} ms.`));
                },
                queueTimeout
            );
        }
    }
    function tryRunNext() {
        if (concurrency >= concurrencyLimit) {
            return;
        }
        const next = queue.shift();
        if (next) {
            concurrency++;
            if (concurrency > maxConcurrency) {
                maxConcurrency = concurrency;
            }
            next.resolve();
        }
    }

    function rateLimiter(asyncFunction) {
        return async (...args) => {
            if (queueLimit !== undefined && queue.length >= queueLimit) {
                throw new Error(`Rate limiting queue has reached limit of ${queueLimit}.`);
            }
            const deferred = new Deferred();
            setQueueTimeout(deferred);
            queue.push(deferred);

            const completionPromise = deferred.promise.then(async () => {
                try {
                    return await asyncFunction(...args);
                } finally {
                    concurrency--;
                    tryRunNext();
                }
            });

            tryRunNext();

            return completionPromise;
        };
    };

    // Syntactic sugar to run a one-off task on a rate limiter.
    rateLimiter.run = async (asyncFunction, ...args) => rateLimiter(asyncFunction)(...args);

    // Expose read-only diagnostic info.
    Object.defineProperty(rateLimiter, 'diagnostics', { get: () => ({
        concurrencyLimit,
        maxConcurrency,
        queueLimit,
        queueTimeout,
        queueLength: queue.length,
    })});

    return rateLimiter;
};
