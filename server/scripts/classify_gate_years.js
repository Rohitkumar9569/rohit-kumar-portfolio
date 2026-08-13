#!/usr/bin/env node
// Classify PDFs by scanning their text for years 2007..2026 and moving them into year folders.
// Usage: node classify_gate_years.js --root public [--apply] [--verbose]

const fs = require('fs');
const path = require('path');
const args = require('minimist')(process.argv.slice(2));
const pdf = require('pdf-parse');

const ROOT = args.root ? path.resolve(process.cwd(), args.root) : path.resolve(__dirname, '../public');
const APPLY = !!args.apply;
const VERBOSE = !!args.verbose;

const YEARS = [];
for(let y=2007;y<=2026;y++) YEARS.push(String(y));
const yearRegex = new RegExp('\\b(' + YEARS.join('|') + ')\\b','g');

async function walk(dir){
  const out=[];
  const ents = await fs.promises.readdir(dir, { withFileTypes:true });
  for(const e of ents){
    const full = path.join(dir, e.name);
    if(e.isDirectory()) out.push(...await walk(full));
    else if(e.isFile() && full.toLowerCase().endsWith('.pdf')) out.push(full);
  }
  return out;
}

(async()=>{
  console.log('Root:', ROOT);
  const org = path.join(ROOT,'gate-organized');
  if(!fs.existsSync(org)){
    console.error('gate-organized not found at', org);
    process.exit(1);
  }

  const all = await walk(org);
  console.log('Total PDFs under gate-organized:', all.length);

  const candidates = all.filter(p => p.includes(path.sep + 'unknown' + path.sep) || /unknown[\\/]*$/i.test(path.dirname(p)));
  console.log('Candidates in unknown:', candidates.length);

  let moved=0;
  for(const file of candidates){
    try{
      const data = await fs.promises.readFile(file);
      let text = '';
      try{
        const res = await pdf(data);
        text = (res.text||'') + '\n' + (res.info && res.info.CreationDate?res.info.CreationDate:'');
      }catch(err){
        if(VERBOSE) console.warn('pdf-parse failed for', file, err.message);
      }

      const m = text.match(yearRegex);
      const found = m && m.length>0 ? m[0] : null;
      if(found){
        const rel = path.relative(org, file);
        const parts = rel.split(path.sep);
        const subject = parts.length>1 ? parts[1] : 'misc';
        const destDir = path.join(org, found, subject);
        await fs.promises.mkdir(destDir, { recursive:true });
        const dest = path.join(destDir, path.basename(file));
        if(APPLY){
          if(fs.existsSync(dest)){
            // if exists, add suffix
            let i=1; let newDest;
            do{ newDest = path.join(destDir, path.basename(file, '.pdf') + ('-'+i)+'.pdf'); i++; }while(fs.existsSync(newDest));
            await fs.promises.rename(file, newDest);
            if(VERBOSE) console.log('Moved', file, '->', newDest);
          } else {
            await fs.promises.rename(file, dest);
            if(VERBOSE) console.log('Moved', file, '->', dest);
          }
        } else {
          console.log('[DRY]', file, '->', destDir);
        }
        moved++;
      } else {
        if(VERBOSE) console.log('No year found in', file);
      }
    }catch(err){
      console.error('Error processing', file, err.message);
    }
  }

  console.log('Done. Files moved:', moved);
})();
