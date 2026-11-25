# BRAGAm API

## Menjalankan server

```bash
cd backend
npm start
```

Default base URL:

```text
http://localhost:5000
```

## Swagger UI untuk testing

Jalankan backend lalu buka:

```text
http://localhost:5000/api-docs
```

Di halaman Swagger:

1. Pilih endpoint.
2. Klik **Try it out**.
3. Isi parameter atau request body.
4. Klik **Execute** untuk melihat response.

OpenAPI JSON tersedia di:

```text
http://localhost:5000/openapi.json
```

Semua request dengan body harus menggunakan:

```http
Content-Type: application/json
```

## Autentikasi

Tidak ada secret yang perlu diatur. Login menghasilkan token sesi acak yang disimpan di
memori backend (`backend/session.js`), berlaku 12 jam, dan bisa dicabut lewat logout.
Saat backend di-restart semua sesi hilang dan pengguna perlu login lagi. Sesi di memori
ditujukan untuk satu proses backend; beberapa proses memerlukan penyimpanan sesi bersama.

* `POST /api/auth/login` dengan `{ "email", "password" }` → `{ "user": {...}, "token": "..." }`
* `POST /api/auth/register` dengan `{ "name", "email", "password" }` → `201 { "user": {...}, "token": "..." }`
* `POST /api/auth/logout` dengan header `Authorization` → `204`, token tidak berlaku lagi

Endpoint bertanda 🔒 membutuhkan header:

```http
Authorization: Bearer <token>
```

Respons `401` berarti token tidak ada, tidak valid, atau kedaluwarsa (login ulang).
Respons `403` berarti token valid tetapi data tersebut milik user lain. Di Swagger UI,
klik **Authorize** lalu tempel token.

## Health check

### `GET /health`

Memeriksa apakah server berjalan dan `DATABASE_URL` sudah terkonfigurasi.

Contoh response `200`:

```json
{
  "status": "OK",
  "databaseConfigured": true,
  "message": "BRAGAm API Server Running"
}
```

## POI

### `GET /api/pois`

Mengambil semua POI yang tersimpan di database.

Contoh response `200`:

```json
[
  {
    "id": "P01",
    "name": "Maison Bogerijen",
    "category": "Kuliner Legendaris",
    "latitude": -6.91775,
    "longitude": 107.60912,
    "triggerRadiusMeters": 10,
    "cooldownSeconds": 60,
    "notificationBody": null,
    "shortDescription": "Restoran legendaris...",
    "notificationTitle": "Kuliner Legendaris Braga",
    "audioGuideUrl": null
  }
]
```

### `GET /api/pois/nearby`

Mengambil satu POI terdekat dalam radius geofence.

Query parameters:

| Parameter | Wajib | Tipe | Keterangan |
|---|---:|---|---|
| `latitude` | Ya | number | Latitude pengguna, -90 sampai 90 |
| `longitude` | Ya | number | Longitude pengguna, -180 sampai 180 |
| `maxRadius` | Tidak | number | Radius maksimum dalam meter, default 15 |

Contoh:

```bash
curl "http://localhost:5000/api/pois/nearby?latitude=-6.91775&longitude=107.60912&maxRadius=15"
```

Response jika ditemukan:

```json
{
  "id": "P01",
  "name": "Maison Bogerijen",
  "category": "Kuliner Legendaris",
  "latitude": -6.91775,
  "longitude": 107.60912,
  "triggerRadiusMeters": 10,
    "cooldownSeconds": 60,
    "notificationBody": null,
  "shortDescription": "Restoran legendaris...",
  "notificationTitle": "Kuliner Legendaris Braga",
  "distanceMeters": 2.41
}
```

Jika tidak ada POI dalam radius, response adalah `null`.

## Users

CRUD user tersedia di `/api/users`. Password tidak pernah dikembalikan oleh API. Saat create atau update, password di-hash menjadi `password_hash` menggunakan bcrypt.

> Endpoint user saat ini belum memiliki authentication/authorization. Gunakan hanya untuk development sampai middleware auth ditambahkan.

### `GET /api/users`

Mengambil semua user tanpa `password_hash`.

### `GET /api/users/:id`

Mengambil satu user berdasarkan UUID.

### `POST /api/users`

Membuat user baru.

Request body:

```json
{
  "email": "user@example.com",
  "name": "User Test",
  "password": "password123"
}
```

Contoh:

```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","name":"User Test","password":"password123"}'
```

Response `201`:

```json
{
  "id": "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  "email": "user@example.com",
  "name": "User Test",
  "created_at": "2026-11-14T07:00:00.000Z",
  "updated_at": "2026-11-14T07:00:00.000Z"
}
```

Validasi:

* `email` wajib valid.
* `password` minimal 8 karakter.
* Email duplikat menghasilkan `409 Conflict`.

### `PATCH /api/users/:id`

Memperbarui satu atau beberapa field user.

Request body:

```json
{
  "name": "Nama Baru",
  "password": "passwordBaru123"
}
```

Field yang dapat diubah:

* `email`
* `name`
* `password`

Password baru juga di-hash sebelum disimpan.

### `DELETE /api/users/:id`

Menghapus user.

Response berhasil: `204 No Content`.

## Ratings

Rating disimpan di tabel terpisah `poi_ratings`. Satu user hanya memiliki satu rating
per POI; operasi create otomatis melakukan *upsert* berdasarkan `(poi_id, user_id)`.

### `GET /api/pois/:poiId/ratings`

Mengambil ringkasan dan daftar review sebuah POI:

* `averageRating`: rata-rata 1–5
* `reviewCount`: total rating
* `highRatingCount`: rating 4–5
* `neutralRatingCount`: rating 3
* `lowRatingCount`: rating 1–2
* `breakdown`: jumlah masing-masing rating 1 sampai 5
* `ratings`: daftar rating beserta nama user bila tersedia

Trigger database memperbarui kolom `rating` dan `reviews_count` pada tabel `pois`
setelah insert, update, atau delete rating.

### 🔒 `POST /api/pois/:poiId/ratings`

Membuat atau memperbarui rating milik user yang sedang login. Penulis rating diambil
dari token, bukan dari body; `userId` di body opsional dan ditolak (`403`) bila berbeda.

```bash
curl -X POST http://localhost:5000/api/pois/P01/ratings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"rating":5,"review":"Tempatnya bagus"}'
```

`rating` harus bilangan bulat 1–5. `review` opsional dan dibatasi 2000 karakter.

### `GET /api/ratings/:id`

Mengambil satu rating berdasarkan ID numerik.

### 🔒 `PATCH /api/ratings/:id`

Memperbarui `rating` dan/atau `review`. Hanya pemilik rating (`403` untuk user lain).

```json
{
  "rating": 4,
  "review": "Sekarang lebih nyaman"
}
```

### 🔒 `DELETE /api/ratings/:id`

Menghapus satu rating milik user yang sedang login. Response berhasil: `204 No Content`.

### `GET /api/users/:id/ratings`

Mengambil semua rating milik satu user berdasarkan UUID.

## Preferensi rekomendasi

Disimpan di tabel `user_preferences` (kolom JSONB, satu baris per user). Jalankan
`migrations/20261123_user_preferences.sql` sebelum memakai endpoint ini.

Kedua endpoint hanya bisa diakses oleh user itu sendiri (token harus milik `:id`).

### 🔒 `GET /api/users/:id/preferences`

Mengembalikan preferensi user. Bila user belum pernah menyimpan, nilai default dikembalikan
dengan `updatedAt: null`.

### 🔒 `PUT /api/users/:id/preferences`

Menyimpan seluruh preferensi. Field yang tidak dikirim memakai default; nilai di luar daftar
berikut ditolak dengan `400`.

| Field | Nilai | Default |
|---|---|---|
| `interests` | array dari `kuliner`, `kafe`, `oleh`, `sejarah`, `hiburan`, `malam` (kosong = semua) | `[]` |
| `visitTime` | `auto` (ikuti jam sekarang), `pagi`, `siang`, `malam` | `auto` |
| `environment` | `any`, `indoor`, `outdoor` | `any` |
| `maxBudget` | `null`, `50000`, `100000`, `200000` (IDR per orang) | `null` |
| `hideClosed` | boolean | `true` |
| `weights` | objek `preference`, `time`, `location`, `rating`, `weather` bernilai 0–3; minimal satu > 0 | semua `2` |

```bash
curl -X PUT http://localhost:5000/api/users/3f2504e0-4f89-41d3-9a0c-0305e82c3301/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"interests":["kafe","sejarah"],"visitTime":"auto","environment":"indoor","maxBudget":100000,"weights":{"weather":3}}'
```

Skor rekomendasi dihitung di aplikasi mobile (`mobile/src/recommendation/engine.js`) dari
preferensi ini, waktu kunjungan, lokasi GPS, rating, dan cuaca terkini (Open-Meteo).
Respons POI kini juga menyertakan `timeCategory`, `environment`, dan `avgDurationMinutes`.

## Status error umum

| Status | Arti |
|---:|---|
| `400` | Input atau UUID tidak valid |
| `401` | Token sesi tidak ada, tidak valid, atau kedaluwarsa |
| `403` | Token valid, tetapi data milik user lain |
| `404` | Data tidak ditemukan |
| `409` | Email sudah terdaftar |
| `500` | Query database gagal |

## Trip dan bookmark pengguna

Endpoint 🔒 `/api/users/:userId/trips` dan `/api/users/:userId/bookmarks` memerlukan
header `Authorization: Bearer <token>` milik user tersebut (lihat **Autentikasi**).

Trip mendukung GET, POST (buat atau perbarui jika ID trip UUID), DELETE
`/:tripId`, dan POST `/:tripId/stops`. Pembuatan atau penggantian daftar tujuan
dijalankan dalam transaksi agar kegagalan satu tujuan tidak menyimpan sebagian trip.
Bookmark mendukung GET, POST, dan DELETE `/:poiId`. Tabel `trips`, `trip_stops`,
dan `user_bookmarks` harus sudah tersedia di database yang digunakan.

## POI uji GPS bersama

Database bersama memiliki salinan **Braga CityWalk (Uji GPS)** dengan ID `TEST-LOCAL`
di koordinat `-6.890389, 107.609583`. POI ini menyalin metadata, radius/cooldown,
dan foto CityWalk `P11`; POI asli tetap berada di koordinat aslinya. Rating, jam buka,
alamat, sejarah, dan deskripsi adalah salinan data CityWalk, bukan informasi tempat
nyata pada titik uji. Audio mobile memakai rekaman `poi11.mp3` pada development
dan production. Pembaruan data P11 berikutnya tidak otomatis mengubah salinan.

Data ditambahkan melalui `backend/seeds/shared-citywalk-gps.sql` secara eksplisit,
bukan saat API startup. Script transaksional ini dapat dijalankan ulang tanpa
menambah salinan POI/foto kedua, dan menolak ID yang sudah dipakai tempat berbeda.
Script hanya menambah data: tidak mengubah schema, RLS, atau P11.

Teman satu tim cukup memakai database backend yang sama, pull `main` terbaru,
dan reload aplikasi agar katalog dimuat ulang. Tidak perlu mengaktifkan fixture
lokal: gunakan `LOCAL_TEST_POI_ENABLED=false`. Endpoint katalog, search, nearby,
detail, dan galeri memperlakukan `TEST-LOCAL` sebagai POI database biasa.
Jika konfigurasi lokal lama masih aktif, record database tetap diprioritaskan
sehingga nama, koordinat, foto, dan ID tidak ditimpa fixture lokal.

## Fixture uji coba lokal opsional

Untuk uji peta/Nearby, pencarian, detail, dan notifikasi GPS, isi `backend/.env`:

```env
LOCAL_TEST_POI_ENABLED=true
LOCAL_TEST_POI_LATITUDE=-6.890389
LOCAL_TEST_POI_LONGITUDE=107.609583
LOCAL_TEST_POI_SOURCE_ID=P11
```

Jika `TEST-LOCAL` belum tersimpan di database tersebut, dengan `LOCAL_TEST_POI_SOURCE_ID=P11`, fixture menjadi **Braga CityWalk (Uji GPS)**: metadata, radius, cooldown, rating, detail dan foto dibaca dari Citywalk asli (`P11`), sedangkan koordinat menggunakan konfigurasi uji di atas. POI asli tetap berada di koordinat aslinya. Fixture memakai URL foto yang sama tanpa membuat baris gambar baru. Endpoint katalog, kategori, pencarian/filter, nearby, detail dan galeri menerima ID fixture yang sama.

Audio `TEST-LOCAL` memakai rekaman `poi11.mp3` milik Citywalk pada semua build, dengan pencocokan ID dan nama. Save dan Directions memakai handler POI yang sama dengan destinasi lain; itinerary tetap mengikuti ketersediaan integrasi aplikasi, bukan mengumumkan penyimpanan palsu.

Restart backend setelah mengubah konfigurasi, lalu reload aplikasi agar PoiProvider mengambil ulang katalog. Fixture opsional hanya menjalankan SELECT dan tidak menulis database. Jika sumber P11 tidak tersedia, request gagal secara eksplisit dan tidak menggantinya dengan POI generik. Hapus `LOCAL_TEST_POI_SOURCE_ID` untuk memakai fixture generik. `LOCAL_TEST_POI_ENABLED=false` atau mode production menonaktifkan fixture opsional; keduanya tidak menyembunyikan POI bersama yang sudah tersimpan di database.

Tanpa source ID, fixture generik bernama **POI Uji Coba Lokal** (`TEST-LOCAL`)
memakai radius 15 meter dan cooldown 60 detik, tanpa foto/audio. POI lokal ini
bukan hasil engine rekomendasi PB11.
