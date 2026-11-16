BEGIN;

-- Approximate street-level location from the Braga POI dataset, not a verified
-- postal address or a reverse-geocoding result. Replace after field review.
-- Bacang Panas Braga is a mobile vendor and can trade at different locations:
-- https://prfmnews.pikiran-rakyat.com/bandung-raya/amp/pr-1310436983/mau-jajan-bacang-panas-braga-yuk-merapat-di-sini-lokasinya-hari-ini
UPDATE public.pois AS p
SET address = source.address
FROM (VALUES
  ('P05', 'Bacang Panas Braga', 'Sekitar Jl. Homan atau Apotek Kimia Farma Braga, Kota Bandung (lokasi berpindah; perlu verifikasi)'),
  ('P06', 'Resto Braga', 'Sekitar Jalan Braga, Kota Bandung (perkiraan; perlu verifikasi)'),
  ('P08', 'Bandung Kunafe Braga', 'Sekitar Jalan Braga, Kota Bandung (perkiraan; perlu verifikasi)'),
  ('P10', 'Galeri Seni / Lukisan Jalan Braga', 'Sekitar Jalan Braga, Kota Bandung (perkiraan; perlu verifikasi)'),
  ('P12', 'The Stockman / Bar & Live Music', 'Sekitar Jalan Braga, Kota Bandung (perkiraan; perlu verifikasi)')
) AS source(id, name, address)
WHERE p.id = source.id AND p.name = source.name
  AND p.latitude BETWEEN -6.9220 AND -6.9135
  AND p.longitude BETWEEN 107.6080 AND 107.6110
  AND NULLIF(BTRIM(p.address), '') IS NULL;

-- Upgrade only our earlier generic estimate for the mobile vendor.
UPDATE public.pois
SET address = 'Sekitar Jl. Homan atau Apotek Kimia Farma Braga, Kota Bandung (lokasi berpindah; perlu verifikasi)'
WHERE id = 'P05' AND name = 'Bacang Panas Braga'
  AND address = 'Sekitar Jalan Braga, Kota Bandung (perkiraan; perlu verifikasi)';

COMMIT;
