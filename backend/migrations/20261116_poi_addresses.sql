BEGIN;

ALTER TABLE public.pois ADD COLUMN IF NOT EXISTS address TEXT;

-- Publicly sourced street addresses; preserve existing curated values and require the expected POI name.
-- P01/P07: https://jdih.bandung.go.id/media/11492?download=true (Braga Permai, ex-Maison Bogerijn)
-- P02: https://elibrary.kemenpar.go.id/storage/app/uploads/public/667/4fb/556/6674fb556b7be657129338.pdf
-- P03: https://openlibrary.telkomuniversity.ac.id/pustaka/files/209273/bab1/pengaruh-harga-dan-store-atmosphere-terhadap-minat-beli-konsumen-mixue-ice-cream-tea-studi-kasus-di-kota-bandung-dalam-bentuk-buku-karya-ilmiah.pdf
-- P04: https://bandungkota.bps.go.id (Direktori Industri Manufaktur Kota Bandung 2024)
-- P09: https://jdih.bandung.go.id/media/11492?download=true
-- P11: https://www.bragacitywalk.co.id/ContactUs
UPDATE public.pois AS p
SET address = source.address
FROM (VALUES
  ('P01', 'Maison Bogerijen', 'Jl. Braga No. 58, Braga, Sumur Bandung, Kota Bandung'),
  ('P02', 'Kopi Toko Djawa', 'Jl. Braga No. 81, Braga, Kota Bandung'),
  ('P03', 'Sweet Cantina', 'Jl. Braga No. 89, Braga, Sumur Bandung, Kota Bandung'),
  ('P04', 'Toko Roti Canary', 'Jl. Braga No. 16, Braga, Sumur Bandung, Kota Bandung'),
  ('P07', 'Braga Permai', 'Jl. Braga No. 58, Braga, Sumur Bandung, Kota Bandung'),
  ('P09', 'Gedung Majestic (De Majestueuz)', 'Jl. Braga No. 1, Braga, Sumur Bandung, Kota Bandung'),
  ('P11', 'Braga CityWalk', 'Jl. Braga No. 99–101, Kota Bandung')
) AS source(id, name, address)
WHERE p.id = source.id AND p.name = source.name
  AND NULLIF(BTRIM(p.address), '') IS NULL;

COMMIT;
