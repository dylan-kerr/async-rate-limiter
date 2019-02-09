const configureRateLimiter = require('./rate-limiter');
const rateLimiter = configureRateLimiter({
    concurrencyLimit: 6,
    queueLimit: 5,
    queueTimeout: 100,
});

function delay(waitMs) {
    return new Promise(resolve => {
        setTimeout(resolve, waitMs);
    });
}

const apiCall = rateLimiter(async () => {
    await delay(Math.random() * 400);
    if (Math.random() < 0.01) {
        throw new Error('Random network error.');
    }
});

async function main() {
    const bulk = [...Array(10)].map(async () => {
        try {
            await apiCall();
            console.log('apiCall succeeds.');
        } catch (err) {
            console.log('apiCall fails.', err);
        }
    });
    const oneshot = rateLimiter.run(() => {})
        .then(() => console.log('oneshot succeeds'), err => console.log('oneshot fails.', err));
    await Promise.all([oneshot, ...bulk]);
    console.log('Diagnostics:', rateLimiter.diagnostics);
}

main().then(
    console.log.bind(null, 'Exiting, no error.'),
    console.error.bind(null, 'Exiting with error.')
);
