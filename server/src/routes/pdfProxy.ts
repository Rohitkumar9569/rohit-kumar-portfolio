import { Router, Request, Response } from 'express';
import { Readable } from 'node:stream';
import { pdfProxyLimiter } from '../middleware/security';

const router = Router();

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// ⚠️ Production me yaha proper domain whitelist lagao
const isHostAllowed = (_hostname: string) => true;

router.get('/', pdfProxyLimiter, async (req: Request, res: Response) => {
  const rawUrl = req.query.url;
  const targetUrl =
    typeof rawUrl === 'string'
      ? rawUrl
      : Array.isArray(rawUrl)
        ? String(rawUrl[0])
        : '';

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

  const rangeHeader =
    typeof req.headers.range === 'string' ? req.headers.range : undefined;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const upstream = await fetch(parsedUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'application/pdf,*/*;q=0.9',
        'Accept-Encoding': 'identity',
        Referer: `${parsedUrl.origin}/`,
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      },
    });

    clearTimeout(timeoutId);

    if (!upstream.ok || !upstream.body) {
      return res
        .status(upstream.status === 403 ? 403 : 502)
        .json({ message: 'Failed to fetch the requested file.', upstreamStatus: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') || 'application/pdf';
    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    const acceptRanges = upstream.headers.get('accept-ranges') || 'bytes';
    const statusCode = upstream.status === 206 ? 206 : 200;

    res.status(statusCode);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', acceptRanges);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Length, Content-Range, Accept-Ranges',
    );
    res.removeHeader('X-Frame-Options');

    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);

    const pdfStream = Readable.fromWeb(
      upstream.body as Parameters<typeof Readable.fromWeb>[0],
    );

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