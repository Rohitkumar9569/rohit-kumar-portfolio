#!/usr/bin/env node
// Organize GATE PDFs by year and paper code and deduplicate by checksum.
// Usage:
//   node organize_gate_pdfs.js --root <path-to-search> [--dry-run] [--apply] [--remove-duplicates]

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = require('minimist')(process.argv.slice(2));
const ROOT = args.root || path.resolve(__dirname, '../public');
const DRY = args['dry-run'] || !args.apply;
const REMOVE_DUP = !!args['remove-duplicates'];
const VERBOSE = !!args.verbose;

const gateCodes = new Set([
  'AE','AG','AR','BM','BT','CE','CH','CS','CY','DA','EC','EE','ES','EY','GA','GE','GG','IN','MA','ME','MN','MT','NM','PE','PH','PI','ST','TF','XE','XL','XH'
]);

function isPdf(file) {
  return file.toLowerCase().endsWith('.pdf');
}

function extractYear(name) {
  const m = name.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : null;
}

function extractCode(name) {
  // match common patterns: CS, CSE, "Computer Science", etc.
  // look for two-letter codes or full subject words
  const up = name.toUpperCase();
  // try two-letter code match (word boundary)
  const two = up.match(/\b([A-Z]{2})\b/);
  if (two && gateCodes.has(two[1])) return two[1];
  // try known names
  if (/COMPUTER/.test(up)) return 'CS';
  if (/CIVIL/.test(up)) return 'CE';
  if (/ELECTRICAL/.test(up) && /ELECTRONICS/.test(up)) return 'EE';
  if (/ELECTRONICS/.test(up) && /COMMUNICA/.test(up)) return 'EC';
  if (/MECHANICAL/.test(up)) return 'ME';
  if (/CHEMICAL/.test(up)) return 'CH';
  if (/PHYSICS/.test(up)) return 'PH';
  if (/MATHEM/.test(up)) return 'MA';
  return 'misc';
}

async function walk(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      results.push(...await walk(full));
    } else if (ent.isFile() && isPdf(ent.name)) {
      results.push(full);
    }
  }
  return results;
}

async function sha1(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1');
    const rs = fs.createReadStream(filePath);
    rs.on('error', reject);
    rs.on('data', (chunk) => hash.update(chunk));
    rs.on('end', () => resolve(hash.digest('hex')));
  });
}

(async () => {
  console.log(`Scanning ${ROOT} for PDFs (dry-run=${DRY})...`);
  const files = await walk(ROOT);
  console.log(`Found ${files.length} PDF files`);

  const gateCandidates = files.filter(p => /\bGATE\b|gate|GATE-?\d{4}|\b(19|20)\d{2}\b/i.test(path.basename(p)) || /gate/i.test(p));
  console.log(`Candidates (match 'gate' or year): ${gateCandidates.length}`);

  const checksumMap = new Map();
  const ops = [];

  for (const f of gateCandidates) {
    const base = path.basename(f, '.pdf');
    const year = extractYear(base) || extractYear(f) || 'unknown';
    const code = extractCode(base);
    const hash = await sha1(f);
    if (checksumMap.has(hash)) {
      const keep = checksumMap.get(hash);
      console.log(`Duplicate: ${f} == ${keep}`);
      if (DRY) continue;
      if (REMOVE_DUP) {
        console.log(`Removing duplicate ${f}`);
        await fs.promises.unlink(f);
        continue;
      } else {
        // move to duplicates folder
        const dupDir = path.join(ROOT, 'gate-duplicates');
        await fs.promises.mkdir(dupDir, { recursive: true });
        const dest = path.join(dupDir, path.basename(f));
        console.log(`Moving duplicate to ${dest}`);
        await fs.promises.rename(f, dest);
        continue;
      }
    }
    checksumMap.set(hash, f);

    const targetDir = path.join(ROOT, 'gate-organized', year.toString(), code);
    const safeName = base.replace(/[^a-zA-Z0-9-_\. ]/g, '_') + '.pdf';
    const dest = path.join(targetDir, safeName);

    ops.push({ from: f, to: dest });
  }

  if (ops.length === 0) {
    console.log('No files to move.');
    return;
  }

  console.log(`Planned moves: ${ops.length}`);
  if (VERBOSE) console.log(ops);

  if (DRY) {
    console.log('Dry-run mode — no files moved. Run with --apply to perform moves.');
    return;
  }

  for (const op of ops) {
    await fs.promises.mkdir(path.dirname(op.to), { recursive: true });
    console.log(`Moving: ${op.from} -> ${op.to}`);
    await fs.promises.rename(op.from, op.to);
  }

  console.log('Done. Organized GATE PDFs under server/public/gate-organized');
})();
