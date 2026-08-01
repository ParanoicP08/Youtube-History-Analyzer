const { Worker } = require('bullmq');

const worker = new Worker('uploadQueue', async job => {
    console.log('Processing job ' + job.id + '...');
    console.log('Job ' + job.id + ' completed successfully.');
}, {
    connection: { host: '127.0.0.1', port: 6379 }
});

console.log('👷 Worker is running and waiting for jobs...');