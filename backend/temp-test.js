const express = require('express');
const app = express();
app.use(express.json({ limit: '50mb' }));
app.post('/x', (req, res) => {
  res.json({ ok: true, received: Boolean(req.body && req.body.items) });
});

const server = app.listen(0, async () => {
  const { port } = server.address();
  const body = { items: Array.from({ length: 20000 }, (_, i) => ({ title: 'Test ' + i })) };
  const res = await fetch('http://127.0.0.1:' + port + '/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  console.log('status', res.status);
  console.log(await res.text());
  server.close();
});
