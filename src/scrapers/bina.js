const BINA_GRAPHQL = 'https://bina.az/graphql';
const BINA_ORIGIN = 'https://bina.az';

const SEARCH_QUERY = `
query SearchItems($first: Int, $after: String, $filter: ItemFilter, $sort: ItemConnectionSort!) {
  itemsConnection(first: $first, after: $after, filter: $filter, sort: $sort) {
    totalCount
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id
        rooms
        hasRepair
        floor
        floors
        updatedAt
        path
        area { value units }
        price { total currency }
        location { id name fullName }
        city { name }
        preview { thumbnail f460x345 }
      }
    }
  }
}
`;

function buildFilter(options = {}) {
  const filter = {
    categoryId: '1', // mənzil
    cityId: '1', // Bakı
    leased: false, // satış
    hasRepair: options.hasRepair !== false,
  };

  if (options.locationIds?.length) {
    filter.locationIds = options.locationIds.map(String);
  }

  if (options.minRooms && options.minRooms >= 3) {
    filter.rooms = `${options.minRooms}+`;
  } else if (options.minRooms === 2) {
    filter.rooms = '2+';
  } else if (options.minRooms === 1) {
    filter.rooms = '1+';
  }

  if (options.priceFrom != null && options.priceFrom !== '') {
    filter.priceFrom = Number(options.priceFrom);
  }
  if (options.priceTo != null && options.priceTo !== '') {
    filter.priceTo = Number(options.priceTo);
  }

  return filter;
}

function mapNode(node) {
  const price = node.price?.total;
  return {
    id: `bina-${node.id}`,
    source: 'bina.az',
    sourceId: String(node.id),
    title: [
      node.rooms ? `${node.rooms} otaqlı` : null,
      node.area?.value ? `${node.area.value} ${node.area.units || 'm²'}` : null,
      node.location?.fullName || node.location?.name,
    ]
      .filter(Boolean)
      .join(' · '),
    price,
    currency: node.price?.currency || 'AZN',
    rooms: node.rooms,
    area: node.area?.value ?? null,
    areaUnits: node.area?.units || 'm²',
    floor: node.floor,
    floors: node.floors,
    hasRepair: Boolean(node.hasRepair),
    location: node.location?.fullName || node.location?.name || '',
    locationId: node.location?.id || null,
    city: node.city?.name || 'Bakı',
    url: `${BINA_ORIGIN}${node.path}`,
    image: node.preview?.f460x345 || node.preview?.thumbnail || null,
    updatedAt: node.updatedAt || null,
  };
}

async function graphqlRequest(variables) {
  const res = await fetch(BINA_GRAPHQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Origin: BINA_ORIGIN,
      Referer: `${BINA_ORIGIN}/baki/alqi-satqi/menziller`,
    },
    body: JSON.stringify({ query: SEARCH_QUERY, variables }),
  });

  if (!res.ok) {
    throw new Error(`bina.az GraphQL HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data.itemsConnection;
}

/**
 * bina.az-dan satış mənzilləri çəkir.
 */
async function searchBina(options = {}) {
  const maxResults = Math.min(Number(options.maxResults) || 40, 100);
  const pageSize = Math.min(maxResults, 48);
  const filter = buildFilter(options);
  const listings = [];
  let after = null;
  let totalCount = 0;

  while (listings.length < maxResults) {
    const conn = await graphqlRequest({
      first: pageSize,
      after,
      filter,
      sort: 'BUMPED_AT_DESC',
    });
    totalCount = conn.totalCount || 0;
    const nodes = (conn.edges || []).map((e) => e.node).filter(Boolean);
    if (!nodes.length) break;

    for (const node of nodes) {
      const item = mapNode(node);
      if (options.minRooms && item.rooms != null && item.rooms < options.minRooms) {
        continue;
      }
      if (options.hasRepair !== false && !item.hasRepair) {
        continue;
      }
      listings.push(item);
      if (listings.length >= maxResults) break;
    }

    if (!conn.pageInfo?.hasNextPage || !conn.pageInfo.endCursor) break;
    after = conn.pageInfo.endCursor;
    // rate-limit
    await new Promise((r) => setTimeout(r, 300));
  }

  return { source: 'bina.az', totalCount, listings, filter };
}

module.exports = { searchBina, buildFilter, DEFAULT_BINA_ORIGIN: BINA_ORIGIN };
