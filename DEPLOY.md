# 🚀 Panduan Deploy NexaBooth ke Cloudflare

## Prasyarat

Install tools berikut sebelum mulai:

```bash
# Node.js 18+ (cek versi)
node -v

# Install Wrangler CLI (Cloudflare)
npm install -g wrangler

# Login ke Cloudflare
wrangler login
```

---

## LANGKAH 1 — Push ke GitHub

```bash
# Di folder nexabooth
git init          # (sudah ada)
git add .
git commit -m "feat: initial nexabooth app"

# Buat repo baru di github.com lalu:
git remote add origin https://github.com/USERNAME/nexabooth.git
git branch -M main
git push -u origin main
```

---

## LANGKAH 2 — Buat D1 Database

```bash
# Buat database
wrangler d1 create nexabooth-db
```

Output akan seperti ini:
```
✅ Successfully created DB 'nexabooth-db'

[[d1_databases]]
binding = "DB"
database_name = "nexabooth-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   ← COPY INI
```

**Buka `wrangler.toml`, ganti `YOUR_D1_DATABASE_ID` dengan ID di atas:**

```toml
[[d1_databases]]
binding = "DB"
database_name = "nexabooth-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   ← paste di sini
```

---

## LANGKAH 3 — Jalankan Migrasi Database

```bash
# Remote (production)
npm run db:migrate:remote
npm run db:seed:remote

# Output sukses:
# ✅ Applied 1 migration
# ✅ 5 frame seeded
```

---

## LANGKAH 4 — Buat Cloudflare Pages Project

### Opsi A: Via Dashboard (Direkomendasikan)

1. Buka [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. Pilih repo `nexabooth` dari GitHub
4. Konfigurasi build:

| Setting | Value |
|---|---|
| Framework preset | `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (default) |
| Node.js version | `18` |

5. Klik **Save and Deploy**

### Opsi B: Via CLI

```bash
# Build dulu
npm run build

# Deploy
wrangler pages deploy dist --project-name nexabooth
```

---

## LANGKAH 5 — Tambahkan D1 Binding di Pages

Setelah project Pages dibuat:

1. **Cloudflare Dashboard** → **Workers & Pages** → pilih `nexabooth`
2. Tab **Settings** → **Functions** → **D1 database bindings**
3. Klik **Add binding**:
   - Variable name: `DB`
   - D1 database: pilih `nexabooth-db`
4. Klik **Save**
5. **Redeploy** agar binding aktif:

```bash
# Trigger redeploy
wrangler pages deploy dist --project-name nexabooth
```

---

## LANGKAH 6 — Set Environment Variables

Di **Cloudflare Dashboard** → Settings → Environment variables:

| Variable | Value | Keterangan |
|---|---|---|
| `ADMIN_PASSWORD` | `password-kamu` | Password login admin |
| `MIDTRANS_SERVER_KEY` | `SB-Mid-server-xxx` | **Opsional** — untuk real payment |
| `MIDTRANS_CLIENT_KEY` | `SB-Mid-client-xxx` | **Opsional** — untuk real payment |

> Tanpa Midtrans, app otomatis pakai **mock payment** (gratis, untuk testing)

---

## LANGKAH 7 — Setup Domain (Opsional)

Di **Settings** → **Custom domains** → **Set up a custom domain**:

```
nexabooth.domainmu.com
```

Cloudflare otomatis generate SSL certificate.

---

## Verifikasi Deploy

Setelah deploy, cek endpoint API:

```bash
# Ganti dengan domain kamu
curl https://nexabooth.pages.dev/api/frames

# Output:
# {"frames":[{"id":"frame-solo","name":"Solo Portrait",...}]}
```

---

## Local Development dengan Full Stack

Untuk dev dengan D1 aktif secara lokal:

```bash
# Migrasi ke local DB
npm run db:migrate:local
npm run db:seed:local

# Jalankan dengan Wrangler (API + Frontend)
npm run pages:dev
# Buka: http://localhost:8788
```

---

## Integrasi Printer Canon

Setelah deploy, printer Canon bisa dipakai langsung via browser:

1. Buka halaman **Print** setelah foto selesai
2. Klik tombol **Print**
3. Pilih printer Canon di dialog print OS
4. Setting kertas:

| Layout | Ukuran Kertas |
|---|---|
| Strip (4 foto) | `2×6 inch` atau `postcard` |
| Solo, Double, Quad | `4×6 inch` |
| Triptych | `6×4 inch landscape` |

5. Matikan margin (set ke 0) untuk hasil terbaik
6. Canon SELPHY CP series → support **AirPrint** (wireless tanpa driver)

---

## Integrasi Midtrans (Real Payment)

1. Daftar di [midtrans.com](https://midtrans.com)
2. Dashboard Midtrans → **Settings** → **Access Keys**
3. Copy **Server Key** dan **Client Key**
4. Set di Cloudflare env vars:
   - Sandbox: key dimulai dengan `SB-`
   - Production: key tanpa prefix `SB-`
5. Redeploy — payment otomatis aktif

---

## Checklist Final Sebelum Launch

- [ ] D1 database dibuat & ID diupdate di `wrangler.toml`
- [ ] Migrasi & seed berhasil dijalankan
- [ ] D1 binding `DB` terhubung di Pages settings
- [ ] `ADMIN_PASSWORD` sudah diset (ganti dari default `admin123`)
- [ ] Test alur lengkap: pilih frame → bayar → foto → print
- [ ] Test admin panel di `/admin`
- [ ] Test gallery dengan session code
- [ ] Canon printer terdeteksi di print dialog
