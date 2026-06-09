const CLOUDINARY_PDF_THUMBNAIL_TRANSFORM = 'pg_1,c_fill,g_north,w_640,h_860,q_auto,f_jpg';

export const getCloudinaryPdfThumbnailUrl = (sourceUrl?: string) => {
  if (!sourceUrl || !sourceUrl.includes('res.cloudinary.com')) return undefined;

  try {
    const url = new URL(sourceUrl);
    if (!url.hostname.includes('res.cloudinary.com')) return undefined;
    if (!/\.pdf$/i.test(url.pathname)) return undefined;
    if (!/\/(?:image|raw)\/upload\//.test(url.pathname)) return undefined;

    url.pathname = url.pathname
      .replace(/\/(?:image|raw)\/upload\//, `/image/upload/${CLOUDINARY_PDF_THUMBNAIL_TRANSFORM}/`)
      .replace(/\.pdf$/i, '.jpg');
    url.search = '';

    return url.toString();
  } catch {
    return sourceUrl
      .replace(/\/(?:image|raw)\/upload\//, `/image/upload/${CLOUDINARY_PDF_THUMBNAIL_TRANSFORM}/`)
      .replace(/\.pdf(?:\?.*)?$/i, '.jpg');
  }
};

export const getPdfThumbnailUrl = (file?: { thumbnailUrl?: string; url?: string; fileUrl?: string } | null) =>
  file?.thumbnailUrl || getCloudinaryPdfThumbnailUrl(file?.url || file?.fileUrl);
