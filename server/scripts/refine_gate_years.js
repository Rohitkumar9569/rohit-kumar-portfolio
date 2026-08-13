#!/usr/bin/env node
// Refine organized GATE PDFs into year folders 2007-2026 and permanently remove duplicates.
// Usage: node refine_gate_years.js --root public [--delete-duplicates] [--dry-run]

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const args = require('minimist')(process.argv.slice(2));

const ROOT = args.root ? path.resolve(process.cwd(), args.root) : path.resolve(__dirname, '../public');
const DRY = args['dry-run'] || false;
const DELETE_DUP = !!args['delete-duplicates'];

const YEARS_START = 2007;
const YEARS_END = 2026;

function isPdf(f){ return f.toLowerCase().endsWith('.pdf'); }

async function walk(dir){
  const res = [];
  const ents = await fs.promises.readdir(dir, { withFileTypes: true });
  for(const e of ents){
    const full = path.join(dir, e.name);
    if(e.isDirectory()) res.push(...await walk(full));
    else if(e.isFile() && isPdf(e.name)) res.push(full);
  }
  return res;
}

function extractYear(name){
  const m = name.match(/\b(20\d{2}|19\d{2})\b/);
  if(!m) return null;
  const y = parseInt(m[0],10);
  if(y>=YEARS_START && y<=YEARS_END) return y;
  return null;
}

function sanitizeName(name){
  return name.replace(/[^a-zA-Z0-9._\- ]/g, '_');
}

async function sha1(file){
  return new Promise((resolve,reject)=>{
    const h = crypto.createHash('sha1');
    const rs = fs.createReadStream(file);
    rs.on('error', reject);
    rs.on('data', d=>h.update(d));
    rs.on('end', ()=>resolve(h.digest('hex')));
  });
}

(async()=>{
  console.log('Root:', ROOT);
  const duplicatesDir = path.join(ROOT,'gate-duplicates');
  if(DELETE_DUP){
    try{
      const dupExists = fs.existsSync(duplicatesDir);
      if(!dupExists){
        console.log('No duplicates folder at', duplicatesDir);
      } else {
        const files = await fs.promises.readdir(duplicatesDir);
        console.log(`Deleting ${files.length} files from gate-duplicates`);
        if(!DRY){
          for(const f of files){
            const full = path.join(duplicatesDir,f);
            await fs.promises.unlink(full);
          }
          // remove directory if empty
          await fs.promises.rmdir(duplicatesDir);
        }
      }
    }catch(err){
      console.error('Error clearing duplicates:', err);
    }
  } else {
    console.log('Skipping duplicate deletion (use --delete-duplicates to remove)');
  }

  const organizedRoot = path.join(ROOT,'gate-organized');
  await fs.promises.mkdir(organizedRoot, { recursive: true });
  // ensure year folders exist
  for(let y=YEARS_START;y<=YEARS_END;y++){
    await fs.promises.mkdir(path.join(organizedRoot,String(y)), { recursive: true });
  }

  console.log('Scanning gate-organized for PDFs...');
  const files = await walk(organizedRoot);
  console.log(`Found ${files.length} PDFs under gate-organized`);

  const checksums = new Map();

  for(const f of files){
    const rel = path.relative(organizedRoot, f);
    // if file already in a top-level year folder, skip unless mismatched
    const parts = rel.split(path.sep);
    let currentYear = null;
    if(parts.length>1 && /^\d{4}$/.test(parts[0])){
      const y = parseInt(parts[0],10);
      if(y>=YEARS_START && y<=YEARS_END) currentYear = y;
    }

    const basename = path.basename(f, '.pdf');
    const foundYear = extractYear(basename);
    const targetYear = foundYear || currentYear || 'unknown';
    if(targetYear === 'unknown'){
      // try parent folder names
      const pparts = path.dirname(f).split(path.sep);
      for(const p of pparts.reverse()){
        const y2 = extractYear(p);
        if(y2) { targetYear = y2; break; }
      }
    }

    let yearStr = targetYear === 'unknown' ? 'unknown' : String(targetYear);
    if(targetYear !== 'unknown' && (targetYear < YEARS_START || targetYear > YEARS_END)){
      yearStr = 'unknown';
    }

    const subject = parts.length>1 ? parts[1] : 'misc';
    const safeName = sanitizeName(path.basename(f));
    const destDir = path.join(organizedRoot, yearStr, subject);
    const dest = path.join(destDir, safeName);

    await fs.promises.mkdir(destDir, { recursive: true });

    // handle duplicates by checksum
    const h = await sha1(f);
    if(checksums.has(h)){
      console.log('Duplicate (checksum) -> deleting:', f);
      if(!DRY){
        await fs.promises.unlink(f);
      }
      continue;
    }
    checksums.set(h, dest);

    if(path.normalize(f) === path.normalize(dest)){
      // already in correct place
      continue;
    }

    // if dest exists, and different, add suffix
    if(fs.existsSync(dest)){
      const existingHash = await sha1(dest);
      if(existingHash === h){
        console.log('Exact file exists at dest, removing source:', f);
        if(!DRY) await fs.promises.unlink(f);
        continue;
      } else {
        let i=1; let newDest;
        do{
          const nameOnly = path.basename(safeName, '.pdf');
          newDest = path.join(destDir, `${nameOnly}-${i}.pdf`);
          i++;
        }while(fs.existsSync(newDest));
        console.log(`Moving ${f} -> ${newDest}`);
        if(!DRY) await fs.promises.rename(f, newDest);
      }
    } else {
      console.log(`Moving ${f} -> ${dest}`);
      if(!DRY) await fs.promises.rename(f, dest);
    }
  }

  console.log('Refine complete. Years created from', YEARS_START, 'to', YEARS_END);
})();
