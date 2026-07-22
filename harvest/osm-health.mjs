#!/usr/bin/env node
// harvest/osm-health.mjs — women's-health facilities in the Chiang Mai metro,
// from OpenStreetMap via Overpass. Zero deps. Snapshot-first: the raw response
// is cached in cache/; re-running extracts from cache and hits nothing unless
// --fetch is passed and the cache is missing.
//
//   node harvest/osm-health.mjs --fetch
//
// WHAT THIS DOES AND DOESN'T DO
// It maps FACILITIES and the verifiable facts attached to them. It does not
// name individual doctors, and it does not rank anyone. Two reasons, both
// practical rather than squeamish:
//   1. The data isn't there. Of ~300 healthcare features in the metro area,
//      only ~24 carry any speciality tag at all. Inferring a named
//      practitioner's specialty or skill from this would be invention.
//   2. Competence is a credential, not a crawl. It is verifiable — Thai
//      Medical Council registration, board certification in obstetrics &
//      gynaecology, hospital accreditation — and README.md lists exactly where
//      to check each one. Scraped star-ratings about a real, named physician
//      are neither reliable nor fair to that physician.
//
// obgyn is therefore a graded, honest signal, never a claim about quality:
//   'tagged'          — OSM explicitly records a gynaecology/obstetrics speciality
//   'hospital-likely' — a general hospital; in Thailand these almost always run
//                       an OB-GYN department, but we have NOT confirmed this one
//   null              — no signal either way
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = join(ROOT, 'cache')
mkdirSync(CACHE, { recursive: true })
const UA = 'cm-womens-health/1.0 (Chiang Mai clinic finder; contact: skunkhaus@gmail.com)'
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const BBOX = '18.60,98.85,18.95,99.15' // greater Chiang Mai metro
const TODAY = new Date().toISOString().slice(0, 10)
const doFetch = process.argv.includes('--fetch')

const QUERY = `[out:json][timeout:90];(
  nwr["amenity"="hospital"](${BBOX});
  nwr["amenity"~"^(clinic|doctors)$"](${BBOX});
  nwr["healthcare"](${BBOX});
);out center tags;`

const file = join(CACHE, 'osm-health.json')
if (!existsSync(file)) {
  if (!doFetch) { console.error('✗ no cache/osm-health.json — run with --fetch'); process.exit(1) }
  let body = null, lastErr = null
  for (let i = 0; i < ENDPOINTS.length && body == null; i++) {
    try {
      process.stdout.write(`fetching from ${new URL(ENDPOINTS[i]).host}… `)
      const res = await fetch(ENDPOINTS[i], {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA },
        body: 'data=' + encodeURIComponent(QUERY),
      })
      if (res.ok) { body = await res.text(); console.log('ok') }
      else { lastErr = `http ${res.status}`; console.log(lastErr); await new Promise((r) => setTimeout(r, 8000)) }
    } catch (e) { lastErr = String(e); console.log('failed'); await new Promise((r) => setTimeout(r, 8000)) }
  }
  if (body == null) { console.error(`✗ overpass failed: ${lastErr}`); process.exit(1) }
  writeFileSync(file, body)
}

const doc = JSON.parse(readFileSync(file, 'utf8'))
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

const GYN = /gynaec|gynec|obstetric|midwif|maternity|สูตินรี|นรีเวช|สูติ/i
const isTaggedGyn = (t) => GYN.test([t['healthcare:speciality'], t.healthcare, t.name, t['name:en'], t['name:th'], t.description].filter(Boolean).join(' '))

// Veterinary facilities are not human healthcare — drop them outright.
const VET = /veterinar|animal|สัตวแพทย์|สัตว์|โรงพยาบาลสัตว์|\bpet\b/i
const isVet = (t) => t.amenity === 'veterinary' || t.healthcare === 'veterinary' ||
  VET.test([t.name, t['name:en'], t['name:th'], t.healthcare, t['healthcare:speciality']].filter(Boolean).join(' '))

// "hospital-likely" rests on the assumption that a GENERAL hospital runs an
// OB-GYN department. A single-specialty hospital (eye, dental, geriatric,
// psychiatric, orthopaedic) does not, so it gets no OB-GYN signal at all.
const SINGLE_SPECIALTY = /dental|dentist|ทันตกรรม|eye|ophthalm|จักษุ|geriatric|ผู้สูงอายุ|psychiatr|mental|จิตเวช|rehab|กายภาพ|orthopaed|orthoped|กระดูก|dermatol|ผิวหนัง|plastic|ศัลยกรรมความงาม|aesthetic|เสริมความงาม/i
const isSingleSpecialty = (t) => SINGLE_SPECIALTY.test(
  [t.name, t['name:en'], t['name:th'], t['healthcare:speciality'], t.description].filter(Boolean).join(' '))

const seen = new Set()
const points = []
let vetSkipped = 0
for (const el of doc.elements || []) {
  const t = el.tags || {}
  const lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon
  if (lat == null || lng == null) continue
  if (isVet(t)) { vetSkipped++; continue }
  const nameTh = t['name:th'] || (t.name && /[฀-๿]/.test(t.name) ? t.name : null)
  const nameEn = t['name:en'] || (t.name && !/[฀-๿]/.test(t.name) ? t.name : null)
  const name = nameTh || nameEn || t.name
  if (!name) continue // unnamed healthcare points are not actionable
  let id = slugify(nameEn || name) || `osm-${el.type}-${el.id}`
  while (seen.has(id)) id = `${id}-${el.id % 1000}`
  seen.add(id)

  const facilityType = t.amenity === 'hospital' ? 'hospital'
    : t.amenity === 'clinic' ? 'clinic'
    : t.amenity === 'doctors' ? 'doctors'
    : t.healthcare || 'other'
  const specialities = (t['healthcare:speciality'] || '').split(';').filter(Boolean)
  const obgyn = isTaggedGyn(t) ? 'tagged'
    : (facilityType === 'hospital' && !isSingleSpecialty(t)) ? 'hospital-likely'
    : null

  points.push({
    id, name, nameEn, nameTh,
    lat: +lat, lng: +lng,
    geoPrecision: el.type === 'node' ? 'exact' : 'block',
    attrs: {
      facilityType,
      obgyn,                                   // graded signal, never a quality claim
      specialities,
      operator: t.operator || null,
      operatorType: t['operator:type'] || null, // public / private / government
      emergency: t.emergency || null,
      beds: t.beds ? Number(t.beds) : null,
      phone: t.phone || t['contact:phone'] || null,
      website: t.website || t['contact:website'] || null,
      openingHours: t.opening_hours || null,
      wheelchair: t.wheelchair || null,
      // Credentials are NOT in OSM. Left null on purpose — fill only from an
      // official registry or first-hand check. See README.md.
      accreditation: null,
      languages: null,
    },
    sources: [{ type: 'osm', ref: `${el.type}/${el.id}`, fetched: TODAY }],
    confidence: 'crawled',
    updatedAt: TODAY,
  })
}

points.sort((a, b) => a.id.localeCompare(b.id))
mkdirSync(join(ROOT, 'data/crawled'), { recursive: true })
writeFileSync(join(ROOT, 'data/crawled/osm-health.json'), JSON.stringify(points, null, 2))

const n = (f) => points.filter(f).length
console.log(`\n${points.length} named healthcare facilities in the Chiang Mai metro`)
console.log(`  hospitals ................ ${n((p) => p.attrs.facilityType === 'hospital')}`)
console.log(`  clinics / doctors ........ ${n((p) => ['clinic', 'doctors'].includes(p.attrs.facilityType))}`)
console.log(`  OB-GYN explicitly tagged . ${n((p) => p.attrs.obgyn === 'tagged')}`)
console.log(`  general hospital (likely). ${n((p) => p.attrs.obgyn === 'hospital-likely')}`)
console.log(`  with a phone number ...... ${n((p) => p.attrs.phone)}`)
console.log(`  with a website ........... ${n((p) => p.attrs.website)}`)
console.log(`  with opening hours ....... ${n((p) => p.attrs.openingHours)}`)
console.log(`  veterinary excluded ...... ${vetSkipped}`)
console.log('\n→ data/crawled/osm-health.json (confidence:crawled — leads, not verified care advice)')
