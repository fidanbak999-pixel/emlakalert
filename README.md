# Emlak Alert

bina.az (əsas) + emlak.az (best-effort) üzərindən **satış / təmirli / min 3 otaq** mənzil axtarışı və hər gün **Bakı vaxtı 08:00**-da `fidanbak999@gmail.com`-a HTML siyahı.

## Default filtrlər

- Satış (alış-satış)
- Təmirli
- Minimum 3 otaq
- Yerlər: Binəqədi r., 20 Yanvar m., Nəsimi m., Şamaxinka (Kubinka), 8-ci mikrorayon, 9-cu mikrorayon, Azadlıq Prospekti m., Memar Əcəmi m.

> **Qeyd:** emlak.az tez-tez Cloudflare ilə bloklanır; bu zaman nəticələr yalnız bina.az-dandır. Şamaxinka bina.az-da ayrıca adla yoxdur — Kubinka locasiyası map olunub.

## Lokal işə salma

```bash
cd emlak-alert
npm install
copy .env.example .env
```

`.env` içində Gmail App Password yaz:

```
GMAIL_USER=fidanbak999@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_TO=fidanbak999@gmail.com
```

Sonra:

```bash
npm start
```

Brauzer: [http://localhost:3000](http://localhost:3000)

Faydalı əmrlər:

- `npm run search` — terminalda axtarış
- `npm run email:test` — dərhal email göndər
- UI-də **İndi email göndər** düyməsi

## Gmail App Password

1. [Google Account → Security](https://myaccount.google.com/security)
2. **2-Step Verification** aktiv et
3. **App passwords** → Mail / Other → 16 simvollu parol yarat
4. Parolu `.env` / Railway env-ə yaz (chat-ə göndərmə)

Adi Gmail şifrəsi işləməyəcək.

## Railway deploy (PC bağlı olsa da mail gəlir)

1. [railway.app](https://railway.app) hesabı aç
2. **New Project → Deploy from GitHub** (və ya CLI ilə bu qovluğu yüklə)
3. Root directory: `emlak-alert` (repo kökündədirsə)
4. **Variables** əlavə et:
   - `GMAIL_USER=fidanbak999@gmail.com`
   - `GMAIL_APP_PASSWORD=...`
   - `EMAIL_TO=fidanbak999@gmail.com`
   - `CRON_SCHEDULE=0 8 * * *`
   - `CRON_TIMEZONE=Asia/Baku`
   - `NODE_TLS_REJECT_UNAUTHORIZED=0` (lazım olsa)
5. Start command: `npm start`
6. Public URL al — sayt orada açılacaq; cron process işlək qaldıqca hər səhər 08:00 Bakı email göndərir

Railway-də process **həmişə işlək** (sleep-siz) plan seç — free sleep olsa cron qaça bilər.

## API

- `GET /api/defaults` — default filtrlər
- `GET|POST /api/search` — axtarış
- `GET /api/cron/status` — cron statusu
- `POST /api/cron/run` — dərhal email

## Vacib

bina.az / emlak.az rəsmi API sənədi vermir; bina.az ictimai GraphQL endpoint-indən oxunur. Sayt strukturu dəyişsə scraper yenilənməlidir. Şəxsi istifadə + rate-limit nəzərə alın.
