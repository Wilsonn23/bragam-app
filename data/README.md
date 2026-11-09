# Documentation: Dataset POI Jalan Braga (PB03)

Dokumen ini berisi spesifikasi, skema, dan panduan integrasi dataset **Point of Interest (POI) Jalan Braga** untuk aplikasi **BRAGAm**. Dataset ini disusun untuk memenuhi kebutuhan kriteria ketercapaian **Product Backlog PB03** pada pengembangan aplikasi BRAGAm (Mata Kuliah II4011 Transformasi Digital).

---

## 1. Ikhtisar Dataset

* **Nama File:** `dataset_poi_braga_pb03.csv`
* **Jumlah Record:** 12 POI Tervalidasi
* **Cakupan Wilayah:** Koridor Jalan Braga, Bandung (Lintang ~`-6.916` s.d. `-6.919`, Bujur ~`107.608` s.d. `107.609`)
* **Format File:** CSV (Comma-Separated Values), UTF-8 Encoding

---

## 2. Kamus Data & Skema Kolom

| Nama Kolom | Tipe Data SQL | Tipe Data CSV | Deskripsi & Aturan Konstrain | Contoh Nilai |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(10)` | String | Primary Key / Kode Unik POI (`P01`–`P12`) | `P01` |
| `name` | `VARCHAR(100)` | String | Nama resmi tempat / UMKM | `Maison Bogerijen` |
| `category` | `VARCHAR(50)` | String | Kategori destinasi untuk filter pencarian | `Kuliner Legendaris` |
| `latitude` | `DOUBLE PRECISION`| Float | Koordinat Lintang (WGS 84) | `-6.91775` |
| `longitude` | `DOUBLE PRECISION`| Float | Koordinat Bujur (WGS 84) | `107.60912` |
| `radius_meters` | `INTEGER` | Integer | Batas radius pemicuan *geofence* (10–15m) | `10` |
| `cooldown_seconds`| `INTEGER` | Integer | Durasi jeda pemicuan ulang notifikasi (detik) | `300` |
| `description` | `TEXT` | String | Deskripsi singkat keunggulan & suasana POI | `Restoran legendaris menyajikan menu...` |
| `history` | `TEXT` | String | Sejarah / cerita latar belakang destinasi | `Berdiri sejak tahun 1929...` |
| `audio_guide_url` | `VARCHAR(255)` | String | URL publik aset suara narasi (*Audio Guide*) | `https://assets.bragam.id/audio/p01.mp3` |
| `opening_hours` | `VARCHAR(50)` | String | Jam operasional buka - tutup | `09:00 - 22:00` |
| `time_category` | `VARCHAR(100)` | String | Tagging segmen waktu (`pagi`, `siang`, `malam`) | `siang, malam` |
| `environment` | `VARCHAR(20)` | String | Tipe area (`indoor`, `outdoor`, `both`) | `indoor` |
| `avg_duration_minutes` | `INTEGER`| Integer | Estimasi rata-rata waktu kunjungan (menit) | `45` |
| `price_min` | `INTEGER` | Integer | Estimasi biaya terendah per orang (IDR) | `45000` |
| `price_max` | `INTEGER` | Integer | Estimasi biaya tertinggi per orang (IDR) | `180000` |
| `menu_highlights` | `TEXT` | String | Daftar produk / menu andalan utama | `Es Krim Vintage, Steak Klasik` |
| `rating` | `NUMERIC(2,1)` | Float | Rating rata-rata pengunjung (skala 1.0–5.0) | `4.6` |
| `reviews_count` | `INTEGER` | Integer | Jumlah total ulasan pengunjung | `1280` |
| `notification_title` | `VARCHAR(150)`| String | Judul notifikasi pop-up saat geofence terpicu | `Kuliner Legendaris Braga` |
| `notification_body` | `TEXT` | String | Pesan ringkas pada modal notifikasi | `Tampilkan card kuliner legendaris...` |

---

## 3. Integrasi & Seeding Database (PostgreSQL + PostGIS)

Untuk mendukung *spatial query* di backend (Node.js / PostGIS), buat tabel dan jalankan perintah *seed* berikut:

### DDL (Data Definition Language)
```sql
-- Pastikan ekstensi PostGIS aktif
CREATE EXTENSION IF NOT EXISTS postgis;

-- Buat Tabel POI
CREATE TABLE pois (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOMETRY(Point, 4326), -- Kolom Geometris PostGIS (WGS 84)
    radius_meters INT DEFAULT 10,
    cooldown_seconds INT DEFAULT 300,
    description TEXT,
    history TEXT,
    audio_guide_url VARCHAR(255),
    opening_hours VARCHAR(50),
    time_category VARCHAR(100),
    environment VARCHAR(20),
    avg_duration_minutes INT DEFAULT 30,
    price_min INT DEFAULT 0,
    price_max INT DEFAULT 0,
    menu_highlights TEXT,
    rating NUMERIC(2,1) DEFAULT 0.0,
    reviews_count INT DEFAULT 0,
    notification_title VARCHAR(150),
    notification_body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Buat Spatial Index untuk Komputasi Jarak Geofence Cepat
CREATE INDEX idx_pois_location ON pois USING GIST (location);
```

### Script Import Data CSV ke PostgreSQL
Jika menggunakan psql CLI:
```sql
\copy pois(id, name, category, latitude, longitude, radius_meters, cooldown_seconds, description, history, audio_guide_url, opening_hours, time_category, environment, avg_duration_minutes, price_min, price_max, menu_highlights, rating, reviews_count, notification_title, notification_body) FROM 'dataset_poi_braga_pb03.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Update Kolom Geometris PostGIS berdasarkan Latitude & Longitude
UPDATE pois 
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);
```

---

## 4. Contoh Kueri Pemicu Geofence (Location-Trigger Query)

Kueri berikut digunakan oleh backend untuk mengeksekusi **Mekanisme 1 (Eksplorasi Otomatis)** dalam radius $\le 15\text{ meter}$:

```sql
SELECT 
    id, 
    name, 
    category,
    radius_meters,
    notification_title,
    notification_body,
    ST_Distance(
        location::geography, 
        ST_SetSRID(ST_MakePoint(:user_longitude, :user_latitude), 4326)::geography
    ) AS distance_meters
FROM pois
WHERE ST_DWithin(
    location::geography, 
    ST_SetSRID(ST_MakePoint(:user_longitude, :user_latitude), 4326)::geography, 
    15 -- Maksimal radius geofence (15 meter)
)
ORDER BY distance_meters ASC
LIMIT 1;
```

---

## 5. Pemeliharaan & Pembaruan Dataset
* **Penambahan POI Baru:** POI baru dapat ditambahkan mengikuti format penamaan ID berikutnya (`P13`, `P14`, dst.).
* **Validasi Lapangan:** Koordinat presisi dan status operasional wajib divalidasi ulang saat *field testing* pada **Sprint 5 (Week 14)**.