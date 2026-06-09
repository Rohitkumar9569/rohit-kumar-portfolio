# Official Study Material Source Rules

Use this file before adding PYQ, syllabus, sample paper, or study material entries to
`official-materials.json`.

## Safe Content Policy

- Official government/exam-body PDFs can be indexed with their official URL.
- Cloudinary mirroring is an admin-controlled action. Keep original attribution/source fields; use mirroring for private study access only after the owner has decided it is appropriate for that deployment.
- Coaching/company material such as PW, Vision IAS, Vajiram, ForumIAS, or paid notes must not be mirrored just because credit is shown. Use only official public links, permission-based uploads, or creator-owned material.
- File names should be student-facing and short: `UPSC CSE Prelims GS Paper I 2024`, `CBSE Class 10 Science Sample Paper 2025-26`, `NCERT Class 12 Physics Part I`.

## Reliability Rules

- Student PDF previews should use the backend PDF proxy for external official URLs. This avoids browser CORS/range-loading failures while keeping the original source URL in the record.
- Keep `sourceUrl`, `sourceName`, and `rightsNote` on every official item so broken links can be repaired later without losing attribution.
- If a source link changes, update the manifest and re-import; do not replace official records with unofficial copies.
- Use Cloudinary as the primary `url` only after the admin mirror flow uploads the prepared PDF under a stable path such as `studyhub/ncert-books/cbse-class-10-science`.
- Run periodic link checks for official URLs and mark failures for admin review before students notice empty/failed previews.

## Recommended Library Paths

```text
School Boards / NCERT / Class 12 / Physics
School Boards / CBSE / Class 10 / Sample Papers / Science
Competitive Exams / UPSC / UPSC CSE / Previous Year Papers / Prelims / GS Paper I
Competitive Exams / UPSC / UPSC CSE / Syllabus
Entrance Exams / GATE / GATE CSE / Previous Year Papers / 2024
Entrance Exams / JEE / JEE Main / Previous Year Papers
Entrance Exams / NEET / NEET UG / Previous Year Papers
State Exams / UPPSC PCS / Previous Year Papers / Prelims
State Exams / JPSC / Previous Year Papers / Mains
```

## Official Starting Points

| Area | Source | URL | Default action |
| --- | --- | --- | --- |
| NCERT textbooks | NCERT | https://ncert.nic.in/textbook.php | Index official PDF URL, mirror only if allowed |
| CBSE sample papers/curriculum | CBSE Academic | https://cbseacademic.nic.in/ | Index official PDF URL |
| UPSC previous papers | UPSC | https://upsc.gov.in/examinations/previous-question-papers | Index official PDF URL |
| UPSC syllabus | UPSC | https://upsc.gov.in/examinations/revised-syllabus-scheme | Index official PDF URL |
| GATE papers/syllabus | GATE 2025 IIT Roorkee, GATE 2026 IIT Guwahati | https://gate2025.iitr.ac.in/ and https://gate2026.iitg.ac.in/ | Index official PDF URL |
| JEE Main | NTA/JEE Main | https://jeemain.nta.nic.in/ | Index official PDF URL when available |
| NEET UG | NTA/NEET | https://neet.nta.nic.in/ | Index official PDF URL when available |
| SSC syllabus/notices | SSC | https://ssc.gov.in/ | Index official PDF URL |
| State PSC PYQs | State PSC official archives | `state-pyq-source-config.json` | Build `state-pyq-official.generated.json`, then import |
| University portals | DU, IGNOU, BHU, JNU, JMI, AMU, GKV | `university-official-materials.json` | Import curated official portals/PDFs without mirroring |
| University PDF crawls | DU/JNU/JMI/AMU/BHU/GKV official pages | `university-official-source-config.json` | Build `university-official.generated.json`, review, then import |
| Open course material | NPTEL, SWAYAM, e-PG Pathshala, e-Adhyayan, AICTE | Official portals/PDFs | Index official URL only |

University paths should use `University Exams / Category / University or College / Program / Branch or Subject / Resource Type`. Avoid generic catch-all folders such as `All Branches`, `All Programs`, or `Branch-wise` when the program and branch are known.

## Current Import Commands

```bash
npm run build-official-manifest
npm run import-official-materials -- --input=src/scripts/official-materials.generated.json --apply
npm run import-official-materials -- --input=src/scripts/official-materials.generated.json --source=UPSC --quiet --apply

npm run build-state-pyq-manifest
npm run import-official-materials -- --input=src/scripts/state-pyq-official.generated.json --apply

npm run build-ncert-manifest
npm run import-official-materials -- --input=src/scripts/ncert-official.generated.json --apply
npm run admin:normalize-ncert-books -- --apply

npm run import-university-official-materials -- --apply

npm run build-university-official-manifest
npm run import-official-materials -- --input=src/scripts/university-official.generated.json --apply
```

State PYQ sources live in `state-pyq-source-config.json`. Stable official
archives are enabled there; homepage-only or uncertain sources are kept with
`"enabled": false` until the current official archive URL is confirmed. This
prevents empty or unrelated state PDFs from being imported just because an
exam body changed its website.

The State PYQ builder supports government-site reliability quirks:

- Use `fetchOptions.rejectUnauthorized: false` only for official hosts with
  known certificate-chain issues, such as PSC WB.
- Use `formField` for official archive pages that expose PDFs through a
  two-step select/post flow, such as JPSC. The PDF proxy replays the official
  POST request at preview time instead of storing brittle guessed direct URLs.
- Keep API-protected React portals disabled until their official API wrapper
  is implemented and verified. This avoids importing homepage placeholders or
  links that look valid but cannot preview for students.

GATE 2025 and GATE 2026 sources include official master question papers,
answer keys, and syllabus PDFs. GATE 2024 IISc uses a protected AJAX table for
its PDFs, so keep it disabled until a verified session-safe table fetcher is
implemented.

The NCERT builder verifies official complete-book ZIP packages from the NCERT
host (`bookCode + dd.zip`) and keeps them under shallow NCERT paths such as:

```text
School Boards / NCERT / Class 10 / Science
School Boards / NCERT / Class 12 / Physics
```

University sources should prefer stable official portals when the university
uses search pages or dynamic links. For example, DU Question Paper Bank, IGNOU
Previous Year Question Papers, BHU Programme/Syllabus, and eGyanKosh entries
are stored as official URL records with `mimeType: "text/html"`. Direct PDFs
are used only when the official PDF URL is stable enough to preview.

The official-material builder uses a UPSC-specific parser for:

```text
https://www.upsc.gov.in/examinations/previous-question-papers
https://www.upsc.gov.in/examinations/previous-question-papers/archives
https://www.upsc.gov.in/examinations/revised-syllabus-scheme
```

It routes official UPSC PDFs into exam folders such as `UPSC CSE`, `NDA`,
`CDS`, `UPSC IFoS`, `UPSC IES`, `UPSC CAPF`, and syllabus folders while keeping
the official source URL and rights note on each file.

## Manifest Fields

```json
{
  "title": "CBSE Class 10 Science Sample Paper 2025-26",
  "url": "https://cbseacademic.nic.in/web_material/SQP/ClassX_2025_26/Science-SQP.pdf",
  "targetPath": ["School Boards", "CBSE", "Class 10", "Sample Papers", "Science"],
  "sourceName": "CBSE Academic",
  "sourceUrl": "https://cbseacademic.nic.in/",
  "sourceType": "official",
  "resourceType": "sample_paper",
  "mirrorAllowed": false,
  "rightsNote": "Official CBSE Academic PDF. Keep official URL unless mirror permission is confirmed.",
  "language": "english",
  "year": 2026,
  "subject": "Science"
}
```
