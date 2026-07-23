import { Router, Request, Response } from 'express';
import { pdfProxyLimiter } from '../middleware/security';

const router = Router();

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// ⚠️ Production me yaha proper domain whitelist lagao
const isHostAllowed = (_hostname: string) => true;

router.get('/', pdfProxyLimiter, async (req: Request, res: Response) => {
  try {
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

    // ✅ Forward Range header (Edge ke liye critical)
    const rangeHeader = req.headers.range;

    const upstreamResponse = await fetch(parsedUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StudyHubPdfProxy/1.0)',
        Accept: 'application/pdf,*/*',
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      },
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      return res.status(502).json({
        message: 'Failed to fetch the requested file.',
      });
    }

    // ✅ Forward important headers
    const contentType =
      upstreamResponse.headers.get('content-type') || 'application/pdf';
    const contentLength = upstreamResponse.headers.get('content-length');
    const contentRange = upstreamResponse.headers.get('content-range');
    const acceptRanges = upstreamResponse.headers.get('accept-ranges');

    res.setHeader('Content-Type', contentType);

    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // ✅ IMPORTANT: X-Frame-Options remove (warna iframe block hoga)
    res.removeHeader('X-Frame-Options');

    // ✅ Forward correct status (200 or 206)
    res.status(upstreamResponse.status);

    // ✅ Stream directly (better than manual pump loop)
    const nodeStream = require('stream');
    nodeStream.pipeline(
      upstreamResponse.body,
      res,
      (err: any) => {
        if (err) {
          console.error('[pdf-proxy] Stream error:', err);
          if (!res.headersSent) {
            res.status(500).end();
          }
        }
      }
    );

  } catch (error) {
    console.error('[pdf-proxy] Fetch failed:', error);

    if (!res.headersSent) {
      res.status(502).json({
        message: 'Unable to load the requested file.',
      });
    } else {
      res.end();
    }
  }
});

export default router;