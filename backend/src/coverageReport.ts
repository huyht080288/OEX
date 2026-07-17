import express, { type Express } from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const coverageDirectory = join(__dirname, '..', 'coverage');

export function mountCoverageReport(app: Express): void {
  if (process.env.NODE_ENV === 'production') return;

  app.get('/testcoverage.html', (_req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OEX Test Coverage</title>
    <style>
      * { box-sizing: border-box; }
      html, body { height: 100%; margin: 0; }
      body { display: grid; grid-template-rows: auto 1fr; font-family: Arial, sans-serif; background: #f4f6fa; }
      nav {
        display: flex; align-items: center; gap: 8px; padding: 10px 16px;
        color: #fff; background: #002060; box-shadow: 0 2px 8px rgba(0, 0, 0, .18);
      }
      nav strong { margin-right: 12px; }
      nav button, nav a {
        padding: 8px 12px; border: 1px solid rgba(255, 255, 255, .35);
        border-radius: 6px; color: #fff; background: rgba(255, 255, 255, .1);
        font: inherit; text-decoration: none; cursor: pointer;
      }
      nav button:hover, nav a:hover { background: rgba(255, 255, 255, .22); }
      nav .spacer { flex: 1; }
      iframe { width: 100%; height: 100%; border: 0; background: #fff; }
    </style>
  </head>
  <body>
    <nav aria-label="Coverage navigation">
      <strong>OEX Test Coverage</strong>
      <button type="button" onclick="document.getElementById('report').contentWindow.history.back()">← Back</button>
      <button type="button" onclick="document.getElementById('report').contentWindow.history.forward()">Forward →</button>
      <button type="button" onclick="document.getElementById('report').src='/coverage/index.html'">Coverage Home</button>
      <button type="button" onclick="document.getElementById('report').contentWindow.location.reload()">Reload</button>
      <span class="spacer"></span>
      <a href="/api/docs" target="_blank" rel="noreferrer">Swagger</a>
      <a href="http://localhost:5001" target="_blank" rel="noreferrer">OEX App</a>
    </nav>
    <iframe id="report" name="report" src="/coverage/index.html" title="Vitest coverage report"></iframe>
  </body>
</html>`);
  });

  app.use('/coverage', express.static(coverageDirectory));
}
