const path = require('path');
const express = require('express');
const { port, defaults, defaultLocations, emailTo, gmailAppPassword } = require('./config');
const { searchListings } = require('./services/search');
const { startCron, runDailyJob, getCronStatus } = require('./services/cron');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/defaults', (_req, res) => {
  res.json({
    defaults,
    locations: defaultLocations,
    emailTo,
    emailConfigured: Boolean(gmailAppPassword),
  });
});

app.get('/api/search', async (req, res) => {
  try {
    const result = await searchListings(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/search', async (req, res) => {
  try {
    const result = await searchListings(req.body || {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cron/status', (_req, res) => {
  res.json(getCronStatus());
});

app.post('/api/cron/run', async (_req, res) => {
  try {
    if (!gmailAppPassword) {
      return res.status(400).json({
        error: 'GMAIL_APP_PASSWORD yoxdur. .env faylına App Password əlavə edin.',
      });
    }
    const status = await runDailyJob();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Emlak Alert http://localhost:${port}`);
  if (gmailAppPassword) {
    startCron();
  } else {
    console.log('[cron] GMAIL_APP_PASSWORD yoxdur — gündəlik email söndürülüb');
  }
});
