import { Router, Request, Response } from 'express';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { pdfProxyLimiter } from '../middleware/security';

const router = Router();

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// ⚠️ Production me proper domain whitelist lagao — abhi sab allow hai.
// Isse tumhara server ek open proxy ban sakta hai (SSRF risk).
const allowedHosts = new Set<string>([
  'upsc.gov.in',
  'www.upsc.gov.in',
  'ssc.gov.in',
  'www.ssc.gov.in',
  // ... apne poore whitelist se copy kar lo (jo study.ts me hai)
]);

const isHostAllowed = (hostname: string) => allowedHosts.has(hostname.toLowerCase());

// Hosts jo Akamai/bot-protection ke peeche hain aur datacenter IP block karte hain
const hostilePdfHosts = new Set(['upsc.gov.in', 'www.upsc.gov.in', 'ssc.gov.in', 'www.ssc.gov.in']);

const CLOUDFLARE_PDF_WORKER = (process.env.CLOUDFLARE_PDF_WORKER_URL || '').replace(/\/+$/, '');

const shouldRouteViaCloudflareWorker = (hostname: string) =>
  Boolean(CLOUDFLARE_PDF_WORKER) && hostilePdfHosts.has(hostname.toLowerCase());

const buildCloudflareWorkerUrl = (sourceUrl: string) =>
  `${CLOUDFLARE_PDF_WORKER}/?url=${encodeURIComponent(sourceUrl)}`;

const getRealisticBrowserHeaders = (sourceUrl: string): Record<string, string> => {
  let referer = '';
  try {
    referer = `${new URL(sourceUrl).origin}/`;
  } catch {
    referer = '';
  }
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    Accept: 'application/pdf,*/*;q=0.9',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
    ...(referer ? { Referer: referer } : {}),
  };
};

const looksLikePdfResponse = (contentType: string, pathname: string) =>
  contentType.toLowerCase().includes('application/pdf') || pathname.toLowerCase().endsWith('.pdf');

// ──────────────────────────────────────────────────────────────
// Disk cache: for hostile hosts, fetch the whole file ONCE via
// the Cloudflare Worker, then serve every (including range)
// request from local disk. This is what actually fixes Akamai's
// burst/rate-limit throttling — pdf.js fires many range requests
// per file open, and without this each one hit UPSC directly.
// ──────────────────────────────────────────────────────────────
const pdfProxyCacheDir = path.resolve(process.cwd(), '.cache', 'pdf-proxy');
const inFlightDownloads = new Map<string, Promise<string>>();

const getCachePath = (sourceUrl: string) => {
  const hash = crypto.createHash('sha256').update(sourceUrl).digest('hex').slice(0, 40);
  return path.join(pdfProxyCacheDir, `${hash}.pdf`);
};

const getCachedFilePath = async (sourceUrl: string): Promise<string | null> => {
  const cachePath = getCachePath(sourceUrl);
  try {
    const stat = await fs.stat(cachePath);
    if (stat.isFile() && stat.size > 0) return cachePath;
  } catch {
    // cache miss
  }
  return null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchViaWorkerWithRetry = async (sourceUrl: string, maxAttempts = 3): Promise<Buffer> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const workerUrl = buildCloudflareWorkerUrl(sourceUrl);
      const response = await fetch(workerUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      const isPdf = looksLikePdfResponse(contentType, new URL(sourceUrl).pathname);

      if (!response.ok || !isPdf) {
        throw new Error(`Worker returned status ${response.status}, content-type ${contentType}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      console.warn(`[pdf-proxy] Worker attempt ${attempt}/${maxAttempts} failed:`, (error as any)?.message);
      if (attempt < maxAttempts) {
        // Exponential-ish backoff, gives Akamai's short rate-limit window time to reset
        await sleep(attempt * 2000);
      }
    }
  }

  throw lastError;
};

const downloadAndCache = async (sourceUrl: string): Promise<string> => {
  const cachePath = getCachePath(sourceUrl);
  await fs.mkdir(path.dirname(cachePath), { recursive: true });

  const buffer = await fetchViaWorkerWithRetry(sourceUrl);

  const tempPath = `${cachePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, buffer);
  await fs.rename(tempPath, cachePath);
  return cachePath;
};

const getOrDownloadCachedPdf = async (sourceUrl: string): Promise<string> => {
  const existing = await getCachedFilePath(sourceUrl);
  if (existing) return existing;

  const inFlight = inFlightDownloads.get(sourceUrl);
  if (inFlight) return inFlight;

  const download = downloadAndCache(sourceUrl).finally(() => {
    inFlightDownloads.delete(sourceUrl);
  });
  inFlightDownloads.set(sourceUrl, download);
  return download;
};

const streamLocalFile = async (filePath: string, rangeHeader: string | undefined, res: Response) => {
  const stat = await fs.stat(filePath);
  const totalSize = stat.size;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2592000');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (rangeHeader) {
    const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
    if (match) {
      let start = match[1] ? Number(match[1]) : 0;
      let end = match[2] ? Number(match[2]) : totalSize - 1;
      if (!match[1] && match[2]) {
        start = Math.max(totalSize - Number(match[2]), 0);
        end = totalSize - 1;
      }
      if (Number.isFinite(start) && Number.isFinite(end) && start <= end && start < totalSize) {
        end = Math.min(end, totalSize - 1);
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        res.setHeader('Content-Length', end - start + 1);
        createReadStream(filePath, { start, end }).pipe(res);
        return;
      }
    }
    res.status(416);
    res.setHeader('Content-Range', `bytes */${totalSize}`);
    res.end();
    return;
  }

  res.status(200);
  res.setHeader('Content-Length', totalSize);
  createReadStream(filePath).pipe(res);
};

// --- Optional curl-based attempt (sometimes bypasses simpler bot checks than fetch) ---
const curlBinary = process.platform === 'win32' ? 'curl.exe' : 'curl';

const streamPdfWithCurl = (sourceUrl: string, rangeHeader: string | undefined, res: Response) =>
  new Promise<boolean>((resolve) => {
    const headers = getRealisticBrowserHeaders(sourceUrl);
    const args = [
      '--location',
      '--silent',
      '--show-error',
      '--max-time',
      '60',
      '--user-agent',
      headers['User-Agent'],
      '--header',
      `Accept: ${headers.Accept}`,
      '--header',
      `Accept-Language: ${headers['Accept-Language']}`,
      '--header',
      `Accept-Encoding: ${headers['Accept-Encoding']}`,
      ...(headers.Referer ? ['--header', `Referer: ${headers.Referer}`] : []),
      ...(rangeHeader ? ['--header', `Range: ${rangeHeader}`] : []),
      '--dump-header',
      '-',
      sourceUrl,
    ];

    const child = spawn(curlBinary, args, { windowsHide: true });
    let headerBuffer = Buffer.alloc(0);
    let headersParsed = false;
    let resolved = false;
    let contentType = '';
    let statusCode = 502;

    const finish = (ok: boolean) => {
      if (resolved) return;
      resolved = true;
      resolve(ok);
    };

    child.stdout.on('data', (chunk: Buffer) => {
      if (!headersParsed) {
        headerBuffer = Buffer.concat([headerBuffer, chunk]);
        const separatorIndex = headerBuffer.indexOf('\r\n\r\n');
        if (separatorIndex === -1) return;

        const headerText = headerBuffer.slice(0, separatorIndex).toString('utf8');
        const bodyStart = headerBuffer.slice(separatorIndex + 4);
        headersParsed = true;

        const lines = headerText.split(/\r?\n/);
        const statusMatch = lines[0]?.match(/HTTP\/\S+\s+(\d{3})/);
        statusCode = statusMatch ? Number(statusMatch[1]) : 502;
        lines.slice(1).forEach((line) => {
          const idx = line.indexOf(':');
          if (idx <= 0) return;
          const key = line.slice(0, idx).trim().toLowerCase();
          const value = line.slice(idx + 1).trim();
          if (key === 'content-type') contentType = value;
        });

        if (statusCode < 200 || statusCode >= 300 || !looksLikePdfResponse(contentType, new URL(sourceUrl).pathname)) {
          child.kill();
          finish(false);
          return;
        }

        res.status(statusCode === 206 ? 206 : 200);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (bodyStart.length) res.write(bodyStart);
        return;
      }

      res.write(chunk);
    });

    child.on('error', () => finish(false));
    child.on('close', (code) => {
      if (!headersParsed) {
        finish(false);
        return;
      }
      if (code === 0) {
        res.end();
        finish(true);
      } else {
        finish(false);
      }
    });

    res.on('close', () => {
      if (!child.killed) child.kill();
    });
  });

router.get('/', pdfProxyLimiter, async (req: Request, res: Response) => {
  const rawUrl = req.query.url;
  const targetUrl =
    typeof rawUrl === 'string' ? rawUrl : Array.isArray(rawUrl) ? String(rawUrl[0]) : '';

  if (!targetUrl) {
    return res.status(400).json({ message: 'Missing "url" query parameter.' });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return res.status(400).json({ message: 'Invalid URL.' });
  }

  if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
    return res.status(400).json({ message: 'Only http/https URLs are allowed.' });
  }

  if (!isHostAllowed(parsedUrl.hostname)) {
    return res.status(403).json({ message: 'This host is not allowed.' });
  }

  const rangeHeader = typeof req.headers.range === 'string' ? req.headers.range : undefined;

  // --- Path 1: hostile hosts → download once via Worker, cache to disk,
  // serve all requests (including every pdf.js range request) from local cache.
  // This is what actually stops UPSC's rate-limit throttling.
  if (shouldRouteViaCloudflareWorker(parsedUrl.hostname)) {
    try {
      const filePath = await getOrDownloadCachedPdf(parsedUrl.toString());
      await streamLocalFile(filePath, rangeHeader, res);
      return;
    } catch (error: any) {
      console.error('[pdf-proxy] Worker+cache path failed:', error?.message);
      if (!res.headersSent) {
        return res.status(502).json({
          message: 'Source blocked or unreachable after retries. Try opening the original link directly.',
        });
      }
      return;
    }
  }

  // --- Path 2: direct fetch with realistic browser headers (non-hostile hosts) ---
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const upstream = await fetch(parsedUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        ...getRealisticBrowserHeaders(parsedUrl.toString()),
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      },
    });

    clearTimeout(timeoutId);

    const contentType = upstream.headers.get('content-type') || '';
    const isPdf = looksLikePdfResponse(contentType, parsedUrl.pathname);

    if (!upstream.ok || !upstream.body || !isPdf) {
      // --- Path 3: last resort — try curl (different TLS/HTTP fingerprint) ---
      const curlOk = await streamPdfWithCurl(parsedUrl.toString(), rangeHeader, res);
      if (curlOk) return;

      if (!res.headersSent) {
        return res.status(upstream.status === 403 ? 403 : 502).json({
          message:
            upstream.status === 403
              ? 'The source blocked this request (likely bot protection). Try opening the original link directly.'
              : 'Failed to fetch the requested file.',
          upstreamStatus: upstream.status,
          upstreamContentType: contentType,
        });
      }
      return;
    }

    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    const acceptRanges = upstream.headers.get('accept-ranges') || 'bytes';
    const statusCode = upstream.status === 206 ? 206 : 200;

    res.status(statusCode);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Accept-Ranges', acceptRanges);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    res.removeHeader('X-Frame-Options');

    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);

    const pdfStream = Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]);
    pdfStream.on('error', (err) => {
      console.error('[pdf-proxy] Stream error:', err.message);
      if (!res.headersSent) res.status(502).end();
      else res.destroy();
    });
    req.on('close', () => pdfStream.destroy());
    pdfStream.pipe(res);
  } catch (error: any) {
    clearTimeout(timeoutId);
    const isTimeout = error?.name === 'AbortError';
    console.error('[pdf-proxy] Fetch failed:', isTimeout ? 'TIMEOUT' : error?.message);

    if (!res.headersSent) {
      return res
        .status(isTimeout ? 504 : 502)
        .json({ message: isTimeout ? 'Upstream timeout.' : 'Unable to load the requested file.' });
    }
    res.destroy();
  }
});

export default router;