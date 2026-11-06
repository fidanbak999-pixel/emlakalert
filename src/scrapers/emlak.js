const cheerio = require('cheerio');

const EMLAK_ORIGIN = 'https://emlak.az';

/**
 * emlak.az çox vaxt Cloudflare (403) qaytarır.
 * Uğursuz olsa boş siyahı + xəta mesajı qaytarırıq — bina.az əsas mənbədir.
 */
async function searchEmlak(options = {}) {
  const maxResults = Math.min(Number(options.maxResults) || 40, 40);
  const params = new URLSearchParams({
    elan_nov: '1', // satış
    emlak: '1', // mənzil
    otaq: String(options.minRooms || 3),
    temir: options.hasRepair !== false ? '1' : '',
  });
  if (options.priceFrom) params.set('qiymet_min', String(options.priceFrom));
  if (options.priceTo) params.set('qiymet_max', String(options.priceTo));

  const url = `${EMLAK_ORIGIN}/elanlar/?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'az,en;q=0.9',
      },
      redirect: 'follow',
    });

    const html = await res.text();
    if (res.status === 403 || /just a moment|cf-browser-verification|challenge-platform/i.test(html)) {
      return {
        source: 'emlak.az',
        totalCount: 0,
        listings: [],
        skipped: true,
        error: 'emlak.az Cloudflare mühafizəsi ilə bloklanıb; nəticələr yalnız bina.az-dandır.',
      };
    }
    if (!res.ok) {
      return {
        source: 'emlak.az',
        totalCount: 0,
        listings: [],
        skipped: true,
        error: `emlak.az HTTP ${res.status}`,
      };
    }

    const $ = cheerio.load(html);
    const listings = [];
    const keywords = (options.locationKeywords || []).map((k) => k.toLowerCase());

    $('a[href*="/elan/"], .elan, .listing, .product, .item').each((_, el) => {
      if (listings.length >= maxResults) return;
      const $el = $(el);
      const href = $el.attr('href') || $el.find('a').attr('href') || '';
      if (!href || !/elan|item|menzil/i.test(href)) return;

      const text = $el.text().replace(/\s+/g, ' ').trim();
      const priceMatch = text.match(/([\d\s]+)\s*(AZN|₼)/i);
      const roomsMatch = text.match(/(\d+)\s*otaq/i);
      const areaMatch = text.match(/([\d.,]+)\s*m²/i);
      const rooms = roomsMatch ? Number(roomsMatch[1]) : null;
      if (options.minRooms && rooms != null && rooms < options.minRooms) return;

      const absUrl = href.startsWith('http') ? href : `${EMLAK_ORIGIN}${href.startsWith('/') ? '' : '/'}${href}`;
      const locationGuess = text.slice(0, 120);
      if (keywords.length) {
        const hay = locationGuess.toLowerCase();
        if (!keywords.some((k) => hay.includes(k))) return;
      }

      listings.push({
        id: `emlak-${Buffer.from(absUrl).toString('base64url').slice(0, 16)}`,
        source: 'emlak.az',
        sourceId: absUrl,
        title: text.slice(0, 100) || 'emlak.az elanı',
        price: priceMatch ? Number(priceMatch[1].replace(/\s/g, '')) : null,
        currency: 'AZN',
        rooms,
        area: areaMatch ? Number(areaMatch[1].replace(',', '.')) : null,
        areaUnits: 'm²',
        floor: null,
        floors: null,
        hasRepair: options.hasRepair !== false,
        location: locationGuess,
        locationId: null,
        city: 'Bakı',
        url: absUrl,
        image: $el.find('img').attr('src') || null,
        updatedAt: null,
      });
    });

    // dedupe by url
    const seen = new Set();
    const unique = listings.filter((l) => {
      if (seen.has(l.url)) return false;
      seen.add(l.url);
      return true;
    });

    return {
      source: 'emlak.az',
      totalCount: unique.length,
      listings: unique.slice(0, maxResults),
      skipped: false,
    };
  } catch (err) {
    return {
      source: 'emlak.az',
      totalCount: 0,
      listings: [],
      skipped: true,
      error: err.message,
    };
  }
}

module.exports = { searchEmlak };
