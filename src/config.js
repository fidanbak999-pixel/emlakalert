require('dotenv').config();

const DEFAULT_LOCATIONS = [
  { id: '58', label: 'Binəqədi r.', source: 'bina' },
  { id: '5', label: '20 Yanvar m.', source: 'bina' },
  { id: '60', label: 'Nəsimi m.', source: 'bina' },
  { id: '70', label: 'Şamaxinka (Kubinka)', source: 'bina' },
  { id: '130', label: '8-ci mikrorayon', source: 'bina' },
  { id: '131', label: '9-cu mikrorayon', source: 'bina' },
  { id: '6', label: 'Azadlıq Prospekti m.', source: 'bina' },
  { id: '59', label: 'Memar Əcəmi m.', source: 'bina' },
];

const defaults = {
  sale: true,
  hasRepair: true,
  minRooms: 3,
  locationIds: DEFAULT_LOCATIONS.map((l) => l.id),
  priceFrom: null,
  priceTo: null,
  maxResults: Number(process.env.MAX_RESULTS || 40),
};

module.exports = {
  port: Number(process.env.PORT || 3000),
  gmailUser: process.env.GMAIL_USER || 'fidanbak999@gmail.com',
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD || '',
  emailTo: process.env.EMAIL_TO || 'fidanbak999@gmail.com',
  cronSchedule: process.env.CRON_SCHEDULE || '0 8 * * *',
  cronTimezone: process.env.CRON_TIMEZONE || 'Asia/Baku',
  defaultLocations: DEFAULT_LOCATIONS,
  defaults,
};
