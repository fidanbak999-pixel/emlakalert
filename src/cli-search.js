require('dotenv').config();
const { searchListings } = require('./services/search');

(async () => {
  const result = await searchListings();
  console.log(JSON.stringify(result, null, 2));
  console.log(`\n${result.listings.length} elan`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
