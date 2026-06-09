import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [url, outPath, widthArg = '390', heightArg = '844'] = process.argv.slice(2);
const width = Number(widthArg);
const height = Number(heightArg);
const port = 9300 + Math.floor(Math.random() * 500);
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.resolve('.codex-logs', `chrome-cdp-${Date.now()}`);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!url || !outPath) {
  console.error('Usage: node .codex-logs/cdp-screenshot.mjs <url> <out.png> [width] [height]');
  process.exit(1);
}

const waitForJson = async (endpoint, timeoutMs = 12000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return response.json();
    } catch {}
    await delay(150);
  }
  throw new Error(`Timed out waiting for ${endpoint}`);
};

await mkdir(path.dirname(path.resolve(outPath)), { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  'about:blank',
], { stdio: 'ignore', windowsHide: true });

try {
  const tabs = await waitForJson(`http://127.0.0.1:${port}/json`);
  const tab = tabs.find((entry) => entry.type === 'page') || tabs[0];
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result || {});
  });

  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await call('Page.enable');
  await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true, screenWidth: width, screenHeight: height });
  await call('Emulation.setTouchEmulationEnabled', { enabled: true });
  await call('Page.navigate', { url });

  const started = Date.now();
  while (Date.now() - started < 16000) {
    const ready = await call('Runtime.evaluate', {
      expression: `Boolean(document.body && document.body.innerText.includes('Folders') && document.querySelector('.study-card-surface'))`,
      returnByValue: true,
    });
    if (ready.result?.value) break;
    await delay(350);
  }
  await delay(700);

  const metrics = await call('Runtime.evaluate', {
    expression: `(() => ({ innerWidth, htmlScrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth }))()`,
    returnByValue: true,
  });
  const screenshot = await call('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(outPath, Buffer.from(screenshot.data, 'base64'));
  console.log(JSON.stringify(metrics.result?.value, null, 2));
} finally {
  chrome.kill('SIGTERM');
}
