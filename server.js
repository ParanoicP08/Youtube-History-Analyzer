const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const jobs = new Map();
let jobCounter = 0;
let uploadQueue = null;
let queueMode = 'memory';

const shouldUseBullMQ = process.env.ENABLE_REDIS === 'true' || Boolean(process.env.REDIS_URL);

if (shouldUseBullMQ) {
    try {
        const { Queue } = require('bullmq');
        uploadQueue = new Queue('uploadQueue', {
            connection: {
                host: process.env.REDIS_HOST || '127.0.0.1',
                port: Number(process.env.REDIS_PORT || 6379)
            }
        });
        queueMode = 'bullmq';
    } catch (error) {
        console.warn('Redis queue unavailable, using in-memory fallback:', error.message);
    }
}

function normalizePayload(body) {
    if (Array.isArray(body)) {
        return { items: body };
    }

    if (body && typeof body === 'object') {
        if (Array.isArray(body.items)) {
            return body;
        }

        return {
            ...body,
            items: Array.isArray(body.history) ? body.history : []
        };
    }

    return { items: [] };
}

function cleanTitle(title) {
    return String(title || '')
        .replace(/^(watched|viewed)\s+/i, '')
        .trim();
}

function extractTitle(item) {
    const directTitle = [
        item?.title,
        item?.videoTitle,
        item?.name,
        item?.details?.[0]?.title,
        item?.details?.[0]?.name,
        item?.titleText
    ].find((value) => typeof value === 'string' && value.trim());

    if (directTitle) {
        return cleanTitle(directTitle);
    }

    return 'Untitled video';
}

function extractChannel(item) {
    const subtitle = item?.subtitles?.find?.((entry) => entry?.name) || item?.subtitles?.[0];
    const detail = item?.details?.find?.((entry) => entry?.name) || item?.details?.[0];
    const directChannel = [
        subtitle?.name,
        detail?.name,
        item?.channel,
        item?.channelName,
        item?.author,
        item?.creator,
        item?.uploader,
        item?.channelTitle
    ].find((value) => typeof value === 'string' && value.trim());

    return directChannel || 'Unknown';
}

function buildAnalysisResult(payload) {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const totalVideos = items.length;

    const channelCounts = new Map();
    for (const item of items) {
        const channel = extractChannel(item);
        channelCounts.set(channel, (channelCounts.get(channel) || 0) + 1);
    }

    const topChannels = Array.from(channelCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    const topTitles = items
        .map((item) => extractTitle(item))
        .filter(Boolean)
        .slice(0, 5);

    const sampleItem = items[0];

    return {
        totalVideos,
        uniqueChannels: channelCounts.size,
        topChannels,
        topTitles,
        sample: sampleItem ? { title: extractTitle(sampleItem), channel: extractChannel(sampleItem) } : null
    };
}

async function enqueueUpload(payload) {
    const jobId = `job-${Date.now()}-${++jobCounter}`;
    const jobRecord = {
        id: jobId,
        status: 'queued',
        payload,
        createdAt: new Date().toISOString()
    };
    jobs.set(jobId, jobRecord);

    const result = buildAnalysisResult(payload);

    if (uploadQueue) {
        try {
            const job = await uploadQueue.add('processHistory', payload);
            jobs.set(jobId, {
                ...jobRecord,
                bullmqJobId: job.id,
                status: 'queued'
            });
            return { success: true, jobId, mode: 'bullmq', result };
        } catch (error) {
            console.warn('BullMQ queue rejected the job, using in-memory fallback:', error.message);
        }
    }

    return { success: true, jobId, mode: 'memory', result };
}

app.get('/api/health', (req, res) => {
    res.json({ ok: true, mode: queueMode });
});

app.post('/api/upload', async (req, res) => {
    try {
        const payload = normalizePayload(req.body);
        const result = await enqueueUpload(payload);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/jobs/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({ success: true, job });
});

function createApp() {
    return app;
}

if (require.main === module) {
    const PORT = Number(process.env.PORT || 4000);
    app.listen(PORT, () => {
        console.log(`🚀 API Server running on http://localhost:${PORT}`);
    });
}

module.exports = { createApp, enqueueUpload, normalizePayload, buildAnalysisResult };
