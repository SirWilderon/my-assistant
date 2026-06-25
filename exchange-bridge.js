// exchange-bridge.js
// Local Express server that bridges the phone app to Exchange calendar
// Run: node exchange-bridge.js
// Listens on port 3001

require('dotenv').config();
const http = require('http');
const { getUpcomingWorkEvents } = require('./exchange');
const { ewsRequest, extractAll } = require('./exchange');

const PORT = 3001;

async function getTodaysEventsStructured() {
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

  const soap = `
    <m:FindItem Traversal="Shallow">
      <m:ItemShape>
        <t:BaseShape>IdOnly</t:BaseShape>
        <t:AdditionalProperties>
          <t:FieldURI FieldURI="item:Subject"/>
          <t:FieldURI FieldURI="calendar:Start"/>
          <t:FieldURI FieldURI="calendar:End"/>
          <t:FieldURI FieldURI="calendar:Location"/>
        </t:AdditionalProperties>
      </m:ItemShape>
      <m:CalendarView StartDate="${startOfDay.toISOString()}" EndDate="${endOfDay.toISOString()}"/>
      <m:ParentFolderIds>
        <t:DistinguishedFolderId Id="calendar"/>
      </m:ParentFolderIds>
    </m:FindItem>`;

  const xml = await ewsRequest(soap);
  const subjects = extractAll(xml, 'Subject');
  const starts = extractAll(xml, 'Start');
  const ends = extractAll(xml, 'End');
  const locations = extractAll(xml, 'Location');

  return subjects.map((subject, i) => ({
    subject,
    start: starts[i] || null,
    end: ends[i] || null,
    location: locations[i] || null
  }));
}

const server = http.createServer(async (req, res) => {
  // Allow CORS from GitHub Pages and ngrok browser warning bypass
  res.setHeader('Access-Control-Allow-Origin', 'https://sirwilderon.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning');
  res.setHeader('ngrok-skip-browser-warning', 'true');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  try {
    if (url === '/exchange-today') {
      const events = await getTodaysEventsStructured();
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, events }));

    } else if (url === '/exchange-upcoming') {
      const params = new URLSearchParams(req.url.split('?')[1] || '');
      const days = parseInt(params.get('days') || '7');
      const events = await getUpcomingWorkEvents(days);
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, events }));

    } else if (url === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, time: new Date().toISOString() }));

    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ ok: false, error: 'Not found' }));
    }
  } catch (err) {
    console.error('Exchange bridge error:', err.message);
    res.writeHead(500);
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Exchange bridge running on http://localhost:${PORT}`);
  console.log(`   Endpoints:`);
  console.log(`   GET /exchange-today    - Today's calendar events`);
  console.log(`   GET /exchange-upcoming - Upcoming events (next 7 days)`);
  console.log(`   GET /health            - Health check`);
});
