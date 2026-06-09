import axios from 'axios';
import { createWriteStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { spawnSync } from 'child_process';
import cloudinary from '../config/cloudinary';

const SCRIPT_DIR = path.resolve(__dirname);
const DOWNLOAD_DIR = path.resolve(SCRIPT_DIR, '../../downloads/ncert-books');
const BOOK_LIST_PATH = path.join(SCRIPT_DIR, 'ncert-books.json');
const EXAMPLE_BOOK_LIST_PATH = path.join(SCRIPT_DIR, 'ncert-books.example.json');
const MANIFEST_PATH = path.join(SCRIPT_DIR, 'ncert-books-upload-manifest.json');

type BookEntry = {
  title?: string;
  class: string;
  subject: string;
  language?: string;
  url: string;
  filename?: string;
  cloudinaryFolder?: string;
  targetPath?: string[] | string;
  sourceName?: string;
  sourceUrl?: string;
  sourceType?: string;
  resourceType?: string;
  mirrorAllowed?: boolean;
  licenseUrl?: string;
  rightsNote?: string;
};

type UploadedBook = BookEntry & {
  localPath: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
  downloadedAt: string;
  uploadedAt?: string;
  error?: string;
};

type Options = {
  compress: boolean;
  quality: 'screen' | 'ebook' | 'printer' | 'prepress' | 'default';
  outputDir: string;
  force: boolean;
  upload: boolean;
};

const DEFAULT_OPTIONS: Options = {
  compress: false,
  quality: 'printer',
  outputDir: DOWNLOAD_DIR,
  force: false,
  upload: true,
};

const parseArgs = (): Options => {
  const args = process.argv.slice(2);
  const options = { ...DEFAULT_OPTIONS };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--compress') {
      options.compress = true;
    } else if (arg === '--no-upload') {
      options.upload = false;
    } else if (arg.startsWith('--quality=')) {
      const value = arg.split('=')[1] as Options['quality'];
      if (['screen', 'ebook', 'printer', 'prepress', 'default'].includes(value)) {
        options.quality = value;
      }
    } else if (arg.startsWith('--output-dir=')) {
      options.outputDir = arg.split('=')[1];
    } else if (arg === '--force') {
      options.force = true;
    }
  }

  return options;
};

const loadBookList = async (): Promise<BookEntry[]> => {
  try {
    const fileContent = await fs.readFile(BOOK_LIST_PATH, 'utf-8');
    return JSON.parse(fileContent) as BookEntry[];
  } catch (error) {
    console.error(`Could not read ${BOOK_LIST_PATH}.`);
    console.error('Create a JSON list of NCERT PDF URLs using ncert-books.example.json as a template.');
    throw error;
  }
};

const ensureDirectory = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const sanitizeName = (value: string) => {
  return value
    .replace(/[<>:"/\\|?*]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const hasPlaceholder = (value: string) => /<[^>]+>/.test(value);

const getSafeFileName = (book: BookEntry): string => {
  const baseName = book.filename || [book.class, book.subject, book.language].filter(Boolean).join(' - ') || 'ncert-book';
  const safe = sanitizeName(baseName).replace(/\.pdf$/i, '');
  return `${safe}.pdf`;
};

const getCloudinaryFolder = (book: BookEntry) => {
  if (book.cloudinaryFolder && book.cloudinaryFolder.trim().length > 0) {
    const segments = book.cloudinaryFolder
      .split(/[\/]+/)
      .map((segment) => sanitizeName(segment).replace(/\s+/g, '_'))
      .filter(Boolean);
    return segments.join('/');
  }
  const segments = [book.class, book.subject]
    .filter(Boolean)
    .map((segment) => sanitizeName(segment).replace(/\s+/g, '_'));
  return ['ncert', ...segments].join('/');
};

const downloadFile = async (url: string, destPath: string) => {
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 60000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NCERT-Downloader/1.0)'
    }
  });

  return new Promise<void>((resolve, reject) => {
    const writer = createWriteStream(destPath);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};

const compressPdf = (inputPath: string, outputPath: string, quality: Options['quality']) => {
  const gsBinary = process.platform === 'win32' ? 'gswin64c' : 'gs';
  const args = [
    '-q',
    '-dNOPAUSE',
    '-dBATCH',
    '-sDEVICE=pdfwrite',
    `-dPDFSETTINGS=/${quality}`,
    `-sOutputFile=${outputPath}`,
    inputPath,
  ];

  const result = spawnSync(gsBinary, args, { stdio: 'inherit' });
  if (result.error) {
    throw new Error(`Ghostscript execution failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Ghostscript returned an error status: ${result.status}`);
  }
};

const uploadToCloudinary = async (filePath: string, folder: string) => {
  const fileBuffer = await fs.readFile(filePath);
  return new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto', folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

const saveManifest = async (manifest: UploadedBook[]) => {
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
};

const main = async () => {
  const options = parseArgs();
  await ensureDirectory(options.outputDir);

  const books = await loadBookList();
  if (!Array.isArray(books) || books.length === 0) {
    throw new Error('Book list is empty. Add NCERT PDF URLs to ncert-books.json.');
  }

  const manifest: UploadedBook[] = [];

  for (const book of books) {
    if (!book.url || hasPlaceholder(book.url)) {
      console.warn(`Skipping placeholder NCERT URL: ${book.url || 'missing URL'}`);
      manifest.push({
        ...book,
        localPath: '',
        downloadedAt: new Date().toISOString(),
        error: 'Skipped placeholder or missing URL',
      });
      continue;
    }

    const filename = getSafeFileName(book);
    const outPath = path.join(options.outputDir, filename);
    const cloudFolder = getCloudinaryFolder(book);

    const entry: UploadedBook = {
      ...book,
      localPath: outPath,
      downloadedAt: new Date().toISOString(),
    };

    const exists = await fs.access(outPath).then(() => true).catch(() => false);
    if (exists && !options.force) {
      console.log(`Skipping existing file: ${filename}`);
      manifest.push({ ...entry, error: 'Skipped because file already exists locally' });
      continue;
    }

    console.log(`Downloading: ${book.url}`);
    try {
      await downloadFile(book.url, outPath);
      console.log(`Saved to: ${outPath}`);

      if (options.compress) {
        const compressedPath = path.join(options.outputDir, `compressed-${filename}`);
        console.log(`Optimizing PDF: ${filename} (quality=${options.quality})`);
        compressPdf(outPath, compressedPath, options.quality);
        await fs.rename(compressedPath, outPath);
        console.log(`Compressed file: ${outPath}`);
      }

      if (options.upload) {
        console.log(`Uploading to Cloudinary folder: ${cloudFolder}`);
        const result = await uploadToCloudinary(outPath, cloudFolder);
        entry.cloudinaryUrl = result.secure_url;
        entry.cloudinaryPublicId = result.public_id;
        entry.uploadedAt = new Date().toISOString();
        console.log(`Uploaded: ${entry.cloudinaryUrl}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed processing ${book.url}: ${message}`);
      entry.error = message;
    }

    manifest.push(entry);
  }

  await saveManifest(manifest);
  console.log(`Manifest saved to ${MANIFEST_PATH}`);
};

main().catch((error) => {
  console.error('NCERT download script failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
