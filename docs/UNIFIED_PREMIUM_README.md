# Unified Premium Catalog Upgrade

## What changed

1. **Coaching labels** – Every note/PDF can show clear source badges:
   - Vision IAS, Vajiram, Made Easy, Allen, Adda247, Testbook, NCERT, Official, Premium, etc.

2. **One premium place** – New structure under `All Premium Exams`:
   - UPSC · State PSC · SSC · Railway · Banking · GATE · JEE · NEET · Defence · CBSE
   - Each has: Syllabus, PYQs, Notes, Mock Tests, + **Coaching Notes** shelves

3. **Seed script** – Maps existing `server/public/*` PDFs into the unified tree.

## How to run

```bash
cd server
# Dry run (no DB write)
npx ts-node src/scripts/seedUnifiedPremiumCatalog.ts

# Apply to MongoDB
npx ts-node src/scripts/seedUnifiedPremiumCatalog.ts --apply

# Verify
npx ts-node src/scripts/seedUnifiedPremiumCatalog.ts --verify
```

## Important

- Copyrighted coaching institute scanned notes are **not** included.
- Use official PYQs, NCERT, and your own / licensed content.
- Set `sourceName` + `sourceType: faculty` when uploading coaching-labelled material you own rights to.
