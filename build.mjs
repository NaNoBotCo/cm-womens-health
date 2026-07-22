#!/usr/bin/env node
// build.mjs — compile the crawled facility list into GeoJSON + CSV.
// Ranks nothing. Sorts OB-GYN-tagged first, then hospitals, then by name, so
// the most relevant leads surface without implying any quality ordering.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const src = join(ROOT, 'data/crawled/osm-health.json')
if (!existsSync(src)) { console.error('✗ no data/crawled/osm-health.json — run: node harvest/osm-health.mjs --fetch'); process.exit(1) }
const pts = JSON.parse(readFileSync(src, 'utf8'))
mkdirSync(join(ROOT, 'dist'), { recursive: true })

const rank = (p) => (p.attrs.obgyn === 'tagged' ? 0 : p.attrs.facilityType === 'hospital' ? 1 : 2)
pts.sort((a, b) => rank(a) - rank(b) || (a.nameEn || a.name).localeCompare(b.nameEn || b.name))

const geo = {
  type: 'FeatureCollection',
  attribution: '© OpenStreetMap contributors (ODbL 1.0)',
  note: 'Facility directory compiled from OpenStreetMap. obgyn is a graded signal, not a quality claim. Not medical advice.',
  features: pts.map((p) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    properties: p,
  })),
}
writeFileSync(join(ROOT, 'dist/cm-womens-health.geojson'), JSON.stringify(geo, null, 2))

const cell = (v) => {
  const s = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const cols = ['id', 'name', 'nameEn', 'nameTh', 'lat', 'lng', 'facilityType', 'obgyn', 'specialities',
  'operator', 'operatorType', 'emergency', 'beds', 'phone', 'website', 'openingHours', 'wheelchair',
  'accreditation', 'languages', 'confidence', 'osm_ref']
const rows = pts.map((p) => ({
  id: p.id, name: p.name, nameEn: p.nameEn, nameTh: p.nameTh, lat: p.lat, lng: p.lng,
  ...p.attrs, confidence: p.confidence,
  osm_ref: (p.sources.find((s) => s.type === 'osm') || {}).ref || '',
}))
writeFileSync(join(ROOT, 'dist/cm-womens-health.csv'),
  [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n')

const n = (f) => pts.filter(f).length
console.log(`built dist/ — ${pts.length} facilities`)
console.log(`  OB-GYN tagged ${n((p) => p.attrs.obgyn === 'tagged')} · hospitals ${n((p) => p.attrs.facilityType === 'hospital')} · with phone ${n((p) => p.attrs.phone)}`)
console.log('  cm-womens-health.geojson, cm-womens-health.csv')
