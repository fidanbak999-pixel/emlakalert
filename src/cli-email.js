require('dotenv').config();
const { searchListings } = require('./services/search');
const { sendDailyDigest } = require('./services/email');
const { emailTo, gmailAppPassword } = require('./config');

(async () => {
  if (!gmailAppPassword) {
    console.error('GMAIL_APP_PASSWORD .env-də yoxdur.');
    process.exit(1);
  }
  const result = await searchListings();
  const info = await sendDailyDigest(result, emailTo);
  console.log(`Göndərildi → ${emailTo} (${result.listings.length} elan)`);
  console.log(info.messageId);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
