const { searchBina } = require('../scrapers/bina');
const { searchEmlak } = require('../scrapers/emlak');
const { defaults, defaultLocations } = require('../config');

const LOCATION_KEYWORDS = [
  'binəqədi',
  'bineqedi',
  '20 yanvar',
  'nəsimi',
  'nesimi',
  'şamaxinka',
  'samaxinka',
  'kubinka',
  '8-ci',
  '8 ci',
  '9-cu',
  '9 cu',
  'azadlıq',
  'azadliq',
  'əcəmi',
  'ecemi',
  'memar',
];

function normalizeOptions(raw = {}) {
  const locationIds =
    raw.locationIds != null
      ? (Array.isArray(raw.locationIds) ? raw.locationIds : String(raw.locationIds).split(','))
          .map((x) => String(x).trim())
          .filter(Boolean)
      : [...defaults.locationIds];

  return {
    hasRepair: raw.hasRepair === false || raw.hasRepair === 'false' || raw.hasRepair === '0' ? false : true,
    minRooms: Number(raw.minRooms != null ? raw.minRooms : defaults.minRooms) || 3,
    locationIds,
    priceFrom: raw.priceFrom === '' || raw.priceFrom == null ? null : Number(raw.priceFrom),
    priceTo: raw.priceTo === '' || raw.priceTo == null ? null : Number(raw.priceTo),
    maxResults: Number(raw.maxResults || defaults.maxResults) || 40,
    includeEmlak: raw.includeEmlak !== false && raw.includeEmlak !== 'false',
  };
}

function dedupeListings(listings) {
  const byKey = new Map();
  for (const item of listings) {
    const key = [
      item.source,
      item.price,
      item.rooms,
      item.area,
      (item.location || '').toLowerCase(),
    ].join('|');
    if (!byKey.has(key)) byKey.set(key, item);
  }
  return [...byKey.values()];
}

async function searchListings(rawOptions = {}) {
  const options = normalizeOptions(rawOptions);
  const warnings = [];
  const startedAt = new Date().toISOString();

  const binaPromise = searchBina(options).catch((err) => {
    warnings.push(`bina.az: ${err.message}`);
    return { source: 'bina.az', totalCount: 0, listings: [], error: err.message };
  });

  const emlakPromise = options.includeEmlak
    ? searchEmlak({
        ...options,
        locationKeywords: LOCATION_KEYWORDS,
      })
    : Promise.resolve({ source: 'emlak.az', listings: [], skipped: true });

  const [bina, emlak] = await Promise.all([binaPromise, emlakPromise]);

  if (emlak.skipped && emlak.error) warnings.push(emlak.error);
  if (emlak.error && !emlak.skipped) warnings.push(emlak.error);
  if (bina.error) warnings.push(bina.error);

  const listings = dedupeListings([...(bina.listings || []), ...(emlak.listings || [])]).sort((a, b) => {
    const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    if (tb !== ta) return tb - ta;
    return (a.price || 0) - (b.price || 0);
  });

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    options,
    locations: defaultLocations.filter((l) => options.locationIds.includes(l.id)),
    totals: {
      bina: bina.totalCount || 0,
      emlak: emlak.totalCount || 0,
      returned: listings.length,
    },
    warnings,
    listings: listings.slice(0, options.maxResults),
  };
}

module.exports = { searchListings, normalizeOptions };
