const assert = require('assert');
const { createApp } = require('../src/server');

(async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          { title: 'Watched Test video', subtitles: [{ name: 'Example Channel' }] },
          { title: 'Viewed Another video', subtitles: [{ name: 'Example Channel' }] },
          { title: 'Third video', subtitles: [{ name: 'Other Channel' }] }
        ]
      })
    });

    const body = await response.json();
    assert.strictEqual(response.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.jobId !== undefined, 'jobId should be present');
    assert.ok(body.result, 'analysis result should be present');
    assert.strictEqual(body.result.totalVideos, 3);
    assert.strictEqual(body.result.uniqueChannels, 2);
    assert.strictEqual(body.result.topChannels[0].name, 'Example Channel');
    assert.ok(body.result.topTitles.includes('Test video'));
    assert.ok(body.result.topTitles.includes('Another video'));
    assert.ok(Array.isArray(body.result.topChannels));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
})();
