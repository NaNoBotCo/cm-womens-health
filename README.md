# cm-womens-health — Chiang Mai women's health facility finder

A fork of the [mueang-map](../mueang-map) crawler pattern, pointed at women's
health care in the Chiang Mai metro. Same spine: **snapshot-first crawling, one
canonical schema, every fact traceable to a source, confidence stated not hidden.**

## What it found

258 named healthcare facilities in the greater Chiang Mai metro
(bbox `18.60,98.85,18.95,99.15`):

| | count |
|---|---|
| hospitals | 49 |
| clinics / doctors' surgeries | 155 |
| **explicitly tagged OB-GYN** | **3** |
| general hospitals (OB-GYN likely, unconfirmed) | 44 |
| with a phone number | 48 |
| with opening hours | 67 |
| veterinary facilities excluded | 3 |

Single-specialty hospitals (eye, dental, geriatric, psychiatric, orthopaedic)
get no OB-GYN signal — they don't run one. Veterinary facilities are dropped
outright; an animal hospital has no place in a women's health directory.

## Read this before trusting the data

**OpenStreetMap cannot tell you who the good gynaecologists are.** That is not a
limitation I'm being coy about — it's the measured result. Of ~300 healthcare
features in the metro area, only ~24 carry *any* speciality tag, and only 3
mention obstetrics/gynaecology. Anything more specific than "here is a facility"
would be invention dressed as data.

So this crawler maps **facilities and verifiable facts**. The `obgyn` field is a
graded signal, never a quality claim:

- `tagged` — OSM explicitly records a gynaecology/obstetrics speciality
- `hospital-likely` — a general hospital. In Thailand these almost always run a
  สูตินรีเวช (OB-GYN) department, but **this one has not been confirmed**
- `null` — no signal either way

`accreditation` and `languages` are deliberately left `null`. They are real and
they matter, but they are not in OpenStreetMap, and filling them from memory
would be the exact failure this project is built to avoid. Fill them from the
registries below, or from your own visit.

## Competence is a credential — here's where to check it

This is the part that actually answers the question. Every one of these is an
official register, verified reachable on 2026-07-19:

| What you want to confirm | Where | Notes |
|---|---|---|
| Is this person a licensed physician in Thailand? | **The Medical Council of Thailand** (แพทยสภา) — <https://tmc.or.th> | Maintains the national register of licensed doctors. Has a licence-lookup; ask the clinic for the doctor's ใบประกอบวิชาชีพ (licence) number. |
| Are they board-certified in OB-GYN specifically? | **Royal Thai College of Obstetricians and Gynaecologists** (ราชวิทยาลัยสูตินรีแพทย์แห่งประเทศไทย) — <https://www.rtcog.or.th> | The specialty board. Board certification (วุฒิบัตร) in สูตินรีเวชวิทยา is the credential that distinguishes an OB-GYN from a general practitioner. |
| Is the hospital accredited? | **Healthcare Accreditation Institute (สรพ. / HA Thailand)** — <https://www.ha.or.th> | Thailand's national hospital accreditation body. HA certification is the domestic quality standard. |
| International accreditation? | **Joint Commission International** — <https://www.jointcommissioninternational.org> | Searchable directory of JCI-accredited organisations. Several Chiang Mai private hospitals hold it; verify current status rather than assuming. |
| Is a private clinic licensed at all? | Ministry of Public Health, Dept. of Health Service Support (กองสถานพยาบาลฯ) | Licences private clinics. A legitimate clinic displays its สถานพยาบาล licence on the premises. |

Practical shortcut that beats any crawl: **ring the hospital's OB-GYN department
and ask which doctors hold the RTCOG board certification, and which speak
English.** Thai hospital switchboards answer this routinely.

## Why there's no rating system here

Named, real physicians are involved. Scraped review scores are unreliable,
usually breach the source's terms, and a low aggregate can defame a competent
doctor who happens to treat difficult cases. This repo's parent project already
settled the same question twice — practitioners are named *"only from field
input, never from memory"*, and *"crawled review scores are not imported"*.
Same rule applies here.

If you want a quality layer, the honest one is **your own notes**: add a `field`
source with what you actually experienced. That's first-hand and attributable.

## Usage

```
node harvest/osm-health.mjs --fetch    # crawl (snapshot-first; cached in cache/)
node harvest/osm-health.mjs            # re-extract from cache, no network
node build.mjs                         # → dist/ GeoJSON + CSV
```

## Licensing

Facility data is derived from OpenStreetMap → **ODbL 1.0**, share-alike.
Attribution: © OpenStreetMap contributors.

## Not medical advice

This is a directory of places, compiled from open data. It is not a
recommendation, a referral, or clinical advice.

---

Contact: Nan · nan@motdang.net · Sponsor: [Ko-fi](https://ko-fi.com/defiantchiangmai) · [Patreon](https://www.patreon.com/nanobotco)
