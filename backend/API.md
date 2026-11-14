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

## Status error umum

| Status | Arti |
|---:|---|
| `400` | Input atau UUID tidak valid |
| `404` | Data tidak ditemukan |
| `409` | Email sudah terdaftar |
| `500` | Query database gagal |
