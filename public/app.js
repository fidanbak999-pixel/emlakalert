const $ = (id) => document.getElementById(id);

const form = $('searchForm');
const heroForm = $('heroSearch');
const locationList = $('locationList');
const listingsEl = $('listings');
const resultsMeta = $('resultsMeta');
const resultsTitle = $('resultsTitle');
const warningsEl = $('warnings');
const activeFiltersEl = $('activeFilters');
const searchBtn = $('searchBtn');
const emailTestBtn = $('emailTestBtn');
const sortSelect = $('sortSelect');
const roomSeg = $('roomSeg');

const FAV_KEY = 'emlak-alert-favs';
const state = {
  locations: [],
  defaults: null,
  minRooms: 3,
  listings: [],
  view: 'grid',
  showFavs: false,
  favs: new Map(JSON.parse(localStorage.getItem(FAV_KEY) || '[]').map((f) => [f.id, f])),
};

const icons = {
  pin: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  bed: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18V7"/><path d="M21 18v-5a3 3 0 0 0-3-3H10v8"/><path d="M3 14h18"/><circle cx="6.5" cy="11" r="1.5"/></svg>',
  area: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h5V4"/><path d="M20 15h-5v5"/></svg>',
  floor: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V9l8-5 8 5v12"/><path d="M9 21v-4h6v4"/><path d="M9 12h6"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5c-2.2 4.6-9.2 9-9.2 9Z"/></svg>',
  home: '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
};

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtNum(n) {
  return Number(n).toLocaleString('az-AZ').replace(/,/g, ' ');
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - Date.parse(iso)) / 60000;
  if (diff < 60) return `${Math.max(1, Math.round(diff))} dəq əvvəl`;
  if (diff < 1440) return `${Math.round(diff / 60)} saat əvvəl`;
  return `${Math.round(diff / 1440)} gün əvvəl`;
}

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.hidden = true), 3500);
}

/* ---------- Filters ---------- */
function renderLocations(selectedIds) {
  const selected = new Set(selectedIds.map(String));
  locationList.innerHTML = state.locations
    .map(
      (loc) => `
      <label class="chip">
        <input type="checkbox" name="locationIds" value="${loc.id}" ${selected.has(String(loc.id)) ? 'checked' : ''} />
        <span>${escapeHtml(loc.label)}</span>
      </label>`
    )
    .join('');
  updateLocSummary();
}

function selectedLocationIds() {
  return [...form.querySelectorAll('input[name="locationIds"]:checked')].map((el) => el.value);
}

function updateLocSummary() {
  const ids = selectedLocationIds();
  const labels = state.locations.filter((l) => ids.includes(l.id)).map((l) => l.label);
  $('heroLocSummary').textContent = labels.length
    ? labels.length <= 2
      ? labels.join(', ')
      : `${labels[0]} +${labels.length - 1}`
    : 'Bütün Bakı';
}

function setRooms(v) {
  state.minRooms = Number(v);
  roomSeg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === state.minRooms));
  $('heroRooms').value = String(state.minRooms);
}

function collectForm() {
  return {
    minRooms: state.minRooms,
    priceFrom: $('priceFrom').value || null,
    priceTo: $('priceTo').value || null,
    hasRepair: $('hasRepair').checked,
    locationIds: selectedLocationIds(),
  };
}

function renderActiveFilters(opts) {
  const chips = ['Satış', `${opts.minRooms}+ otaq`];
  if (opts.hasRepair) chips.push('Təmirli');
  if (opts.priceFrom) chips.push(`min ${fmtNum(opts.priceFrom)} AZN`);
  if (opts.priceTo) chips.push(`maks ${fmtNum(opts.priceTo)} AZN`);
  chips.push(`${opts.locationIds.length || 'Bütün'} yer`);
  activeFiltersEl.innerHTML = chips.map((c) => `<span class="af">${escapeHtml(c)}</span>`).join('');
}

/* ---------- Listings ---------- */
function sortListings(list) {
  const arr = [...list];
  const ppm = (x) => (x.price && x.area ? x.price / x.area : Infinity);
  switch (sortSelect.value) {
    case 'price-asc':
      return arr.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    case 'price-desc':
      return arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    case 'area-desc':
      return arr.sort((a, b) => (b.area ?? 0) - (a.area ?? 0));
    case 'ppm-asc':
      return arr.sort((a, b) => ppm(a) - ppm(b));
    default:
      return arr.sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0));
  }
}

function cardHtml(item, i) {
  const isFav = state.favs.has(item.id);
  const ppm = item.price && item.area ? `${fmtNum(Math.round(item.price / item.area))} AZN/m²` : '';
  const media = item.image
    ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" onerror="this.remove()" />`
    : '';
  return `
    <article class="card" style="animation-delay:${Math.min(i, 12) * 40}ms">
      <a class="card-media" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
        <span class="placeholder">${icons.home}</span>
        ${media}
        <div class="tags">
          ${item.hasRepair ? '<span class="tag orange">Təmirli</span>' : ''}
          <span class="tag">${escapeHtml(item.source)}</span>
        </div>
      </a>
      <button type="button" class="fav ${isFav ? 'on' : ''}" data-id="${escapeHtml(item.id)}" aria-label="Seçilmişlərə əlavə et">${icons.heart}</button>
      <div class="card-body">
        <div class="price">${item.price != null ? `${fmtNum(item.price)} ${escapeHtml(item.currency || 'AZN')}` : 'Qiymət yoxdur'}${ppm ? `<small>${ppm}</small>` : ''}</div>
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
          <h3 class="card-title">${item.rooms ?? '—'} otaqlı mənzil${item.area ? `, ${item.area} m²` : ''}</h3>
        </a>
        <p class="loc">${icons.pin}${escapeHtml(item.location || item.city)}</p>
        <div class="specs">
          <span>${icons.bed}${item.rooms ?? '—'} otaq</span>
          <span>${icons.area}${item.area ?? '—'} m²</span>
          ${item.floor != null ? `<span>${icons.floor}${item.floor}/${item.floors || '?'}</span>` : ''}
        </div>
        <div class="card-foot">
          <span>${timeAgo(item.updatedAt)}</span>
          <a class="view" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Elana bax →</a>
        </div>
      </div>
    </article>`;
}

function renderListings() {
  const source = state.showFavs ? [...state.favs.values()] : state.listings;
  const list = sortListings(source);
  listingsEl.classList.toggle('list', state.view === 'list');
  resultsTitle.textContent = state.showFavs ? 'Seçilmişlər' : 'Satış mənzilləri';

  if (!list.length) {
    listingsEl.innerHTML = `<div class="empty">${
      state.showFavs ? 'Hələ seçilmiş elan yoxdur — kartdakı ürəyə bas.' : 'Bu filtrə uyğun elan tapılmadı. Filtrləri genişləndir.'
    }</div>`;
    return;
  }
  listingsEl.innerHTML = list.map(cardHtml).join('');
}

function renderSkeleton() {
  listingsEl.classList.toggle('list', false);
  listingsEl.innerHTML = Array.from({ length: 6 })
    .map(() => '<div class="skeleton"><div class="sk-img"></div><div class="sk-line" style="width:50%"></div><div class="sk-line" style="width:80%"></div><div class="sk-line" style="width:65%"></div></div>')
    .join('');
}

function updateFavCount() {
  $('favCount').textContent = state.favs.size;
}

listingsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.fav');
  if (!btn) return;
  const id = btn.dataset.id;
  if (state.favs.has(id)) {
    state.favs.delete(id);
  } else {
    const item = state.listings.find((l) => l.id === id);
    if (item) state.favs.set(id, item);
  }
  localStorage.setItem(FAV_KEY, JSON.stringify([...state.favs.values()]));
  updateFavCount();
  if (state.showFavs) renderListings();
  else btn.classList.toggle('on', state.favs.has(id));
});

/* ---------- Search ---------- */
async function runSearch() {
  state.showFavs = false;
  const opts = collectForm();
  renderActiveFilters(opts);
  searchBtn.disabled = true;
  searchBtn.textContent = 'Axtarılır…';
  resultsMeta.textContent = 'bina.az və emlak.az yoxlanılır…';
  renderSkeleton();
  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Axtarış alınmadı');
    state.listings = data.listings;
    resultsMeta.textContent = `${data.listings.length} elan göstərilir · bazada ${fmtNum(data.totals.bina)} uyğun elan`;
    $('statTotal').textContent = fmtNum(data.totals.bina);
    if (data.warnings?.length) {
      warningsEl.hidden = false;
      warningsEl.innerHTML = data.warnings.map((w) => `<div>${escapeHtml(w)}</div>`).join('');
    } else {
      warningsEl.hidden = true;
    }
    renderListings();
  } catch (err) {
    resultsMeta.textContent = err.message;
    listingsEl.innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Nəticələri göstər';
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  runSearch();
});

form.addEventListener('change', (e) => {
  if (e.target.name === 'locationIds') updateLocSummary();
});

heroForm.addEventListener('submit', (e) => {
  e.preventDefault();
  setRooms($('heroRooms').value);
  $('priceTo').value = $('heroPriceTo').value;
  runSearch();
  $('results').scrollIntoView({ behavior: 'smooth' });
});

roomSeg.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) setRooms(b.dataset.v);
});

$('resetBtn').addEventListener('click', () => {
  const d = state.defaults;
  setRooms(d.minRooms);
  $('priceFrom').value = '';
  $('priceTo').value = '';
  $('heroPriceTo').value = '';
  $('hasRepair').checked = d.hasRepair;
  renderLocations(d.locationIds);
  runSearch();
});

sortSelect.addEventListener('change', renderListings);

document.querySelectorAll('.view-toggle button').forEach((b) =>
  b.addEventListener('click', () => {
    state.view = b.dataset.view;
    document.querySelectorAll('.view-toggle button').forEach((x) => x.classList.toggle('on', x === b));
    renderListings();
  })
);

$('favNavLink').addEventListener('click', (e) => {
  e.preventDefault();
  state.showFavs = true;
  renderListings();
  resultsMeta.textContent = `${state.favs.size} seçilmiş elan`;
  $('results').scrollIntoView({ behavior: 'smooth' });
});

emailTestBtn.addEventListener('click', async () => {
  emailTestBtn.disabled = true;
  emailTestBtn.textContent = 'Göndərilir…';
  try {
    const res = await fetch('/api/cron/run', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Email göndərilmədi');
    toast(`Email göndərildi — ${data.count} elan`);
  } catch (err) {
    toast(err.message);
  } finally {
    emailTestBtn.disabled = false;
    emailTestBtn.textContent = 'İndi email göndər';
  }
});

/* ---------- Init ---------- */
async function init() {
  const [d, cron] = await Promise.all([
    fetch('/api/defaults').then((r) => r.json()),
    fetch('/api/cron/status').then((r) => r.json()),
  ]);
  state.defaults = d.defaults;
  state.locations = d.locations;

  setRooms(d.defaults.minRooms);
  $('hasRepair').checked = d.defaults.hasRepair;
  renderLocations(d.defaults.locationIds);
  updateFavCount();

  if (d.emailConfigured) {
    const pill = $('emailStatus');
    pill.classList.add('ok');
    pill.innerHTML = `<span class="dot"></span>08:00 → ${escapeHtml(d.emailTo)}`;
    $('alertText').textContent = `Siyahı hər gün Bakı vaxtı 08:00-da ${d.emailTo} ünvanına göndərilir.`;
    $('cronStatus').textContent = `Cron: ${cron.schedule} · ${cron.timezone}`;
  } else {
    document.querySelectorAll('[data-email]').forEach((el) => el.remove());
  }

  runSearch();
}

init().catch((err) => {
  resultsMeta.textContent = err.message;
});
