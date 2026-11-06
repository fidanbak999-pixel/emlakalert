const nodemailer = require('nodemailer');
const { gmailUser, gmailAppPassword, emailTo } = require('../config');

function formatPrice(item) {
  if (item.price == null) return '—';
  return `${Number(item.price).toLocaleString('az-AZ')} ${item.currency || 'AZN'}`;
}

function buildEmailHtml(result) {
  const dateStr = new Date().toLocaleString('az-AZ', { timeZone: 'Asia/Baku' });
  const locs = (result.locations || []).map((l) => l.label).join(', ');
  const rows = (result.listings || [])
    .map(
      (item, i) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e8e8e8;vertical-align:top;">${i + 1}</td>
        <td style="padding:10px;border-bottom:1px solid #e8e8e8;vertical-align:top;">
          ${item.image ? `<a href="${item.url}"><img src="${escapeHtml(item.image)}" width="140" style="display:block;border-radius:10px;margin-bottom:8px;" alt=""></a>` : ''}
          <a href="${item.url}" style="color:#0d264f;text-decoration:none;font-weight:700;">${escapeHtml(item.title)}</a>
          <div style="color:#555;font-size:13px;margin-top:4px;">${escapeHtml(item.location)} · ${escapeHtml(item.source)}</div>
        </td>
        <td style="padding:10px;border-bottom:1px solid #e8e8e8;vertical-align:top;white-space:nowrap;">${formatPrice(item)}</td>
        <td style="padding:10px;border-bottom:1px solid #e8e8e8;vertical-align:top;">${item.rooms ?? '—'} otaq</td>
        <td style="padding:10px;border-bottom:1px solid #e8e8e8;vertical-align:top;">${item.area != null ? `${item.area} ${item.areaUnits || 'm²'}` : '—'}</td>
      </tr>`
    )
    .join('');

  const warnings =
    result.warnings?.length > 0
      ? `<p style="color:#a15c00;background:#fff7e6;padding:10px;border-radius:8px;">${result.warnings.map(escapeHtml).join('<br>')}</p>`
      : '';

  return `<!DOCTYPE html>
<html lang="az">
<head><meta charset="utf-8"><title>Gündəlik mənzil siyahısı</title></head>
<body style="margin:0;padding:24px;background:#f4f6f8;font-family:Segoe UI,Arial,sans-serif;color:#1a1a1a;">
  <div style="max-width:860px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,.06);">
    <h1 style="margin:0 0 8px;font-size:22px;">Gündəlik mənzil siyahısı</h1>
    <p style="margin:0 0 16px;color:#555;">Bakı vaxtı: ${escapeHtml(dateStr)}</p>
    <p style="margin:0 0 8px;"><strong>Filtr:</strong> satış · təmirli · min ${result.options?.minRooms || 3} otaq</p>
    <p style="margin:0 0 16px;"><strong>Yerlər:</strong> ${escapeHtml(locs)}</p>
    <p style="margin:0 0 16px;">Tapılan: <strong>${result.listings?.length || 0}</strong>
      (bina.az bazasında ~${result.totals?.bina ?? 0})</p>
    ${warnings}
    ${
      result.listings?.length
        ? `<table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f0f3f7;text-align:left;">
          <th style="padding:10px;">#</th>
          <th style="padding:10px;">Elan</th>
          <th style="padding:10px;">Qiymət</th>
          <th style="padding:10px;">Otaq</th>
          <th style="padding:10px;">Sahə</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
        : `<p>Bu filtrə uyğun elan tapılmadı.</p>`
    }
    <p style="margin-top:24px;color:#888;font-size:12px;">Emlak Alert · şəxsi axtarış bildirişi</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createTransport() {
  if (!gmailAppPassword) {
    throw new Error('GMAIL_APP_PASSWORD təyin olunmayıb (.env)');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
}

async function sendDailyDigest(result, to = emailTo) {
  const transport = createTransport();
  const count = result.listings?.length || 0;
  const info = await transport.sendMail({
    from: `"Emlak Alert" <${gmailUser}>`,
    to,
    subject: `Mənzil siyahısı · ${count} elan · ${new Date().toLocaleDateString('az-AZ', { timeZone: 'Asia/Baku' })}`,
    html: buildEmailHtml(result),
  });
  return info;
}

module.exports = { sendDailyDigest, buildEmailHtml, createTransport };
