/**
 * Peoples Bakers outlet API — local catalog + optional Google Places merge.
 */
const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data", "outlets.json");
const PLACES_CACHE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const API_VERSION = "2.0";

const GOOGLE_TEXT_QUERIES = [
  "Peoples Bakers Sri Lanka",
  "Peoples Bakers Colombo",
  "Peoples Bakers Kandy",
  "Peoples Bakers Galle",
  "Peoples Bakers Negombo",
  "Peoples Bakers Malabe",
  "Peoples Bakers Nugegoda",
];

let catalog = null;
let googleCache = { fetchedAt: 0, outlets: [], queries: 0 };

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadCatalog() {
  if (!catalog) {
    try {
      if (!fs.existsSync(DATA_PATH)) {
        console.warn("[outlets] catalog missing:", DATA_PATH);
        catalog = { updated: null, source: "local", outlets: [] };
        return catalog;
      }
      const raw = fs.readFileSync(DATA_PATH, "utf8");
      const parsed = JSON.parse(raw);
      catalog = {
        updated: parsed.updated || null,
        source: parsed.source || "local",
        outlets: (parsed.outlets || []).map(enrichOutlet),
      };
    } catch (err) {
      console.warn("[outlets] catalog load failed:", err.message);
      catalog = { updated: null, source: "local", outlets: [] };
    }
  }
  return catalog;
}

function reloadCatalog() {
  catalog = null;
  return loadCatalog();
}

function phoneHref(phone) {
  if (!phone) return "";
  return "tel:" + String(phone).replace(/[^\d+]/g, "");
}

function whatsappHref(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(
    "Hi Peoples Bakers, I'd like to ask about your outlet."
  )}`;
}

function googleMapsSearchUrl(outlet) {
  const query = encodeURIComponent(
    `${outlet.name}, ${outlet.address}, Sri Lanka`
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function googleMapsEmbedUrl(outlet) {
  if (outlet.lat != null && outlet.lng != null) {
    return `https://maps.google.com/maps?q=${outlet.lat},${outlet.lng}&z=15&output=embed`;
  }
  const query = encodeURIComponent(`${outlet.name}, ${outlet.address}`);
  return `https://maps.google.com/maps?q=${query}&z=15&output=embed`;
}

function inferRegion(area) {
  if (/kandy|matale|nuwara|badulla|central/i.test(area || "")) {
    return "Central";
  }
  if (/galle|matara|hambantota|southern/i.test(area || "")) {
    return "Southern";
  }
  if (/jaffna|north/i.test(area || "")) {
    return "Northern";
  }
  return "Western";
}

function enrichOutlet(outlet) {
  const base = { ...outlet };
  if (!base.region) base.region = inferRegion(base.area);
  if (!base.source) base.source = "local";
  return withLinks(base);
}

function withLinks(outlet) {
  const links = {
    directions: googleMapsSearchUrl(outlet),
    embed: googleMapsEmbedUrl(outlet),
    call: phoneHref(outlet.phone) || null,
    whatsapp: whatsappHref(outlet.phone) || null,
    google: googleMapsSearchUrl(outlet),
  };
  return {
    ...outlet,
    directionsUrl: links.directions,
    embedUrl: links.embed,
    phoneTel: links.call || "",
    whatsappUrl: links.whatsapp || "",
    geo:
      outlet.lat != null && outlet.lng != null
        ? { lat: outlet.lat, lng: outlet.lng }
        : null,
    links,
  };
}

function formatPublicOutlet(outlet, extra = {}) {
  return {
    id: outlet.id,
    name: outlet.name,
    area: outlet.area,
    region: outlet.region,
    address: outlet.address,
    phone: outlet.phone || null,
    hours: outlet.hours || null,
    type: outlet.type,
    source: outlet.source || "local",
    geo: outlet.geo || null,
    links: outlet.links || {
      directions: outlet.directionsUrl,
      embed: outlet.embedUrl,
      call: outlet.phoneTel || null,
      whatsapp: outlet.whatsappUrl || null,
      google: outlet.directionsUrl,
    },
    directionsUrl: outlet.directionsUrl,
    embedUrl: outlet.embedUrl,
    phoneTel: outlet.phoneTel,
    whatsappUrl: outlet.whatsappUrl,
    ...extra,
  };
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function searchScore(outlet, term) {
  if (!term) return 0;
  let score = 0;
  const fields = [
    { value: outlet.area, exact: 90, prefix: 70, includes: 45 },
    { value: outlet.name, exact: 80, prefix: 60, includes: 35 },
    { value: outlet.address, exact: 0, prefix: 40, includes: 25 },
    { value: outlet.region, exact: 75, prefix: 55, includes: 30 },
    { value: outlet.type, exact: 50, prefix: 35, includes: 20 },
  ];

  for (const field of fields) {
    const value = String(field.value || "").toLowerCase();
    if (!value) continue;
    if (value === term) score += field.exact;
    else if (value.startsWith(term)) score += field.prefix;
    else if (value.includes(term)) score += field.includes;
  }
  return score;
}

function mapGooglePlace(place) {
  const loc = place.geometry && place.geometry.location;
  const address = place.formatted_address || place.vicinity || "";
  const area = address.split(",")[0] || place.name || "Sri Lanka";
  return withLinks({
    id: place.place_id || `google-${String(place.name || "").slice(0, 24)}`,
    name: place.name || "Peoples Bakers",
    area,
    region: inferRegion(area),
    address,
    phone: "",
    hours:
      place.opening_hours && place.opening_hours.open_now ? "Open now" : "",
    type: "Google listing",
    lat: loc ? loc.lat : null,
    lng: loc ? loc.lng : null,
    source: "google",
    placeId: place.place_id || null,
    rating: place.rating || null,
  });
}

function isPeoplesBakersPlace(place) {
  return /peoples?\s+bakers?/i.test(place.name || "");
}

async function googlePlacesJson(url) {
  const res = await fetch(url);
  if (!res.ok) return { status: "HTTP_ERROR", results: [] };
  return res.json();
}

async function fetchGooglePlaces(apiKey) {
  const now = Date.now();
  if (
    googleCache.outlets.length &&
    now - googleCache.fetchedAt < PLACES_CACHE_MS
  ) {
    return googleCache;
  }

  const merged = new Map();
  let queries = 0;

  for (const text of GOOGLE_TEXT_QUERIES) {
    queries += 1;
    const url =
      "https://maps.googleapis.com/maps/api/place/textsearch/json?query=" +
      encodeURIComponent(text) +
      "&region=lk&key=" +
      apiKey;
    const data = await googlePlacesJson(url);
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.warn("[outlets] Google text:", data.status, data.error_message || "");
    }
    for (const place of data.results || []) {
      if (!isPeoplesBakersPlace(place)) continue;
      const outlet = mapGooglePlace(place);
      merged.set(outlet.id, outlet);
    }
    await sleep(250);
  }

  queries += 1;
  const nearbyUrl =
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=7.8731,80.7718&radius=400000&keyword=" +
    encodeURIComponent("Peoples Bakers") +
    "&key=" +
    apiKey;
  const nearby = await googlePlacesJson(nearbyUrl);
  for (const place of nearby.results || []) {
    if (!isPeoplesBakersPlace(place)) continue;
    const outlet = mapGooglePlace(place);
    merged.set(outlet.id, outlet);
  }

  googleCache = {
    fetchedAt: now,
    outlets: Array.from(merged.values()),
    queries,
  };
  return googleCache;
}

async function buildMasterList(useGoogle = true) {
  const { outlets: staticList, updated, source } = loadCatalog();
  const list = staticList.slice();
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  let googleEnabled = Boolean(apiKey);
  let googleCount = 0;
  let googleSyncedAt = null;
  let googleQueries = 0;

  if (useGoogle && apiKey) {
    try {
      const cache = await fetchGooglePlaces(apiKey);
      googleSyncedAt = new Date(cache.fetchedAt).toISOString();
      googleQueries = cache.queries;
      const seen = new Set(list.map((o) => `${o.lat},${o.lng}`));
      for (const outlet of cache.outlets) {
        const key = `${outlet.lat},${outlet.lng}`;
        if (!seen.has(key)) {
          list.push(outlet);
          seen.add(key);
          googleCount += 1;
        }
      }
    } catch (err) {
      console.warn("[outlets] Google fetch failed:", err.message);
    }
  }

  return {
    list,
    updated,
    source,
    googleEnabled,
    googleCount,
    googleSyncedAt,
    googleQueries,
  };
}

function buildFacets(list) {
  const regions = [];
  const types = [];
  const seenR = new Set();
  const seenT = new Set();
  for (const o of list) {
    if (o.region && !seenR.has(o.region)) {
      seenR.add(o.region);
      regions.push(o.region);
    }
    if (o.type && !seenT.has(o.type)) {
      seenT.add(o.type);
      types.push(o.type);
    }
  }
  regions.sort();
  types.sort();
  return { regions, types };
}

function parseNumber(value) {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseBool(value, defaultValue) {
  if (value == null || value === "") return defaultValue;
  return !["0", "false", "no"].includes(String(value).toLowerCase());
}

function applyListFilters(list, options) {
  const {
    q = "",
    type = "",
    region = "",
    lat,
    lng,
    radius,
    sort = "",
    north,
    south,
    east,
    west,
  } = options;

  const term = String(q).trim().toLowerCase();
  const typeFilter = String(type).trim();
  const regionFilter = String(region).trim();
  let filtered = list.slice();

  if (typeFilter && typeFilter.toLowerCase() !== "all") {
    filtered = filtered.filter((o) => o.type === typeFilter);
  }

  if (regionFilter && regionFilter.toLowerCase() !== "all") {
    filtered = filtered.filter((o) => o.region === regionFilter);
  }

  if (term) {
    filtered = filtered
      .map((o) => ({ ...o, _score: searchScore(o, term) }))
      .filter((o) => o._score > 0)
      .sort((a, b) => b._score - a._score)
      .map(({ _score, ...o }) => formatPublicOutlet(o, { relevance: _score }));
  } else {
    filtered = filtered.map((o) => formatPublicOutlet(o));
  }

  const hasBounds =
    north != null &&
    south != null &&
    east != null &&
    west != null &&
    !Number.isNaN(north) &&
    !Number.isNaN(south) &&
    !Number.isNaN(east) &&
    !Number.isNaN(west);

  if (hasBounds) {
    filtered = filtered.filter((o) => {
      if (!o.geo) return false;
      return (
        o.geo.lat >= south &&
        o.geo.lat <= north &&
        o.geo.lng >= west &&
        o.geo.lng <= east
      );
    });
  }

  const hasCoords =
    lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);

  if (hasCoords) {
    filtered = filtered
      .filter((o) => o.geo)
      .map((o) => {
        const distanceKm =
          Math.round(haversineKm(lat, lng, o.geo.lat, o.geo.lng) * 10) / 10;
        return { ...o, distanceKm };
      });

    if (radius != null && !Number.isNaN(radius)) {
      filtered = filtered.filter((o) => o.distanceKm <= radius);
    }

    if (!sort || sort === "distance") {
      filtered.sort((a, b) => a.distanceKm - b.distanceKm);
    }
  }

  if (sort === "name") {
    filtered.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  } else if (sort === "area") {
    filtered.sort((a, b) => String(a.area).localeCompare(String(b.area)));
  } else if (sort === "type") {
    filtered.sort((a, b) => String(a.type).localeCompare(String(b.type)));
  } else if (sort === "relevance" && term) {
    filtered.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
  }

  return { filtered, term, typeFilter, regionFilter, hasCoords, hasBounds, lat, lng, radius, sort };
}

function paginate(list, limit, offset) {
  const safeLimit = Math.min(
    Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);
  const page = list.slice(safeOffset, safeOffset + safeLimit);
  return {
    page,
    total: list.length,
    limit: safeLimit,
    offset: safeOffset,
    hasMore: safeOffset + page.length < list.length,
  };
}

function buildListResponse(masterMeta, listResult, pageResult, filtersExtra = {}) {
  const { list, updated, source, googleEnabled, googleCount, googleSyncedAt, googleQueries } =
    masterMeta;
  const facets = buildFacets(list);
  const { filtered, term, typeFilter, regionFilter, hasCoords, lat, lng, radius, sort } =
    listResult;
  const { page, total, limit, offset, hasMore } = pageResult;

  return {
    ok: true,
    apiVersion: API_VERSION,
    count: page.length,
    total,
    limit,
    offset,
    hasMore,
    updated,
    source,
    googleEnabled,
    googleCount,
    googleSyncedAt,
    googleQueries,
    facets,
    filters: {
      q: term || null,
      type: typeFilter || null,
      region: regionFilter || null,
      lat: hasCoords ? lat : null,
      lng: hasCoords ? lng : null,
      radius: radius != null ? radius : null,
      sort: sort || (hasCoords ? "distance" : null),
      ...filtersExtra,
    },
    nearest:
      hasCoords && page[0]
        ? { id: page[0].id, area: page[0].area, distanceKm: page[0].distanceKm }
        : null,
    outlets: page,
  };
}

async function getOutlets(options = {}) {
  const masterMeta = await buildMasterList(options.useGoogle !== false);
  const listResult = applyListFilters(masterMeta.list, options);
  const pageResult = paginate(
    listResult.filtered,
    options.limit,
    options.offset
  );
  return buildListResponse(masterMeta, listResult, pageResult);
}

async function getOutletsNearby(lat, lng, radiusKm = 25, options = {}) {
  return getOutlets({
    ...options,
    lat,
    lng,
    radius: radiusKm,
    sort: "distance",
  });
}

async function getOutletsInBounds(north, south, east, west, options = {}) {
  return getOutlets({
    ...options,
    north,
    south,
    east,
    west,
    sort: options.sort || "area",
  });
}

async function getSuggestions(q, limit = 8) {
  const term = String(q || "").trim().toLowerCase();
  if (term.length < 2) {
    return { ok: true, query: term, suggestions: [] };
  }

  const { list } = await buildMasterList(true);
  const suggestions = list
    .map((o) => ({ outlet: o, score: searchScore(o, term) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(limit, 12))
    .map(({ outlet, score }) => ({
      id: outlet.id,
      label: `${outlet.area} — ${outlet.name}`,
      area: outlet.area,
      region: outlet.region,
      type: outlet.type,
      relevance: score,
    }));

  return { ok: true, query: term, count: suggestions.length, suggestions };
}

function toGeoJSON(outletList) {
  return {
    type: "FeatureCollection",
    features: outletList
      .filter((o) => o.geo)
      .map((o) => ({
        type: "Feature",
        id: o.id,
        geometry: {
          type: "Point",
          coordinates: [o.geo.lng, o.geo.lat],
        },
        properties: {
          id: o.id,
          name: o.name,
          area: o.area,
          region: o.region,
          address: o.address,
          phone: o.phone,
          hours: o.hours,
          type: o.type,
          source: o.source,
          links: o.links,
        },
      })),
  };
}

async function getOutletsGeoJSON(options = {}) {
  const data = await getOutlets({ ...options, limit: MAX_LIMIT, offset: 0 });
  return {
    ok: true,
    apiVersion: API_VERSION,
    total: data.total,
    ...toGeoJSON(data.outlets),
  };
}

async function getOutletById(id, options = {}) {
  const { list } = await buildMasterList(true);
  const outlet = list.find((o) => o.id === id);
  if (!outlet) return null;

  const formatted = formatPublicOutlet(outlet);
  let nearby = [];

  if (options.includeNearby !== false && formatted.geo) {
    nearby = list
      .filter((o) => o.id !== id && o.lat != null && o.lng != null)
      .map((o) => ({
        outlet: formatPublicOutlet(o),
        distanceKm:
          Math.round(
            haversineKm(
              formatted.geo.lat,
              formatted.geo.lng,
              o.lat,
              o.lng
            ) * 10
          ) / 10,
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5)
      .map((row) => ({ ...row.outlet, distanceKm: row.distanceKm }));
  }

  return { ok: true, outlet: formatted, nearby };
}

async function getOutletsMeta() {
  const masterMeta = await buildMasterList(true);
  const facets = buildFacets(masterMeta.list);
  return {
    ok: true,
    apiVersion: API_VERSION,
    updated: masterMeta.updated,
    source: masterMeta.source,
    total: masterMeta.list.length,
    googleEnabled: masterMeta.googleEnabled,
    googleCount: masterMeta.googleCount,
    googleSyncedAt: masterMeta.googleSyncedAt,
    googleQueries: masterMeta.googleQueries,
    facets,
    types: facets.types,
    regions: facets.regions,
    endpoints: getApiDocs().endpoints.map((e) => e.path),
  };
}

function getApiDocs() {
  return {
    ok: true,
    apiVersion: API_VERSION,
    title: "Peoples Bakers Outlets API",
    description:
      "Search, filter, and locate Peoples Bakers branches across Sri Lanka. Local data is always included; Google Places listings merge when GOOGLE_MAPS_API_KEY is configured.",
    endpoints: [
      {
        method: "GET",
        path: "/api/outlets",
        summary: "List/filter outlets",
        query: ["q", "type", "region", "lat", "lng", "radius", "sort", "limit", "offset", "google"],
      },
      {
        method: "GET",
        path: "/api/outlets/suggest?q=",
        summary: "Autocomplete suggestions",
      },
      {
        method: "GET",
        path: "/api/outlets/nearby?lat=&lng=&radius=",
        summary: "Nearest outlets",
      },
      {
        method: "GET",
        path: "/api/outlets/bounds?north=&south=&east=&west=",
        summary: "Outlets inside map viewport",
      },
      {
        method: "GET",
        path: "/api/outlets/geojson",
        summary: "GeoJSON feature collection",
      },
      {
        method: "GET",
        path: "/api/outlets/meta",
        summary: "Catalog metadata and facets",
      },
      {
        method: "GET",
        path: "/api/outlets/:id",
        summary: "Single outlet with nearby branches",
      },
      {
        method: "GET",
        path: "/api/outlets/docs",
        summary: "This documentation",
      },
    ],
  };
}

function parseOutletQuery(query) {
  return {
    q: query.q || "",
    type: query.type || "",
    region: query.region || "",
    lat: parseNumber(query.lat),
    lng: parseNumber(query.lng),
    radius: parseNumber(query.radius),
    north: parseNumber(query.north),
    south: parseNumber(query.south),
    east: parseNumber(query.east),
    west: parseNumber(query.west),
    sort: query.sort || "",
    limit: query.limit,
    offset: query.offset,
    useGoogle: parseBool(query.google, true),
  };
}

module.exports = {
  getOutlets,
  getOutletsNearby,
  getOutletsInBounds,
  getOutletsGeoJSON,
  getSuggestions,
  getOutletById,
  getOutletsMeta,
  getApiDocs,
  parseOutletQuery,
  reloadCatalog,
  toGeoJSON,
};
