-- Seed: menu items per POI (table from migrations/20261127_poi_menu_items.sql).
--
-- Collected 2026-11-27 from public web sources; every row records its source.
-- Prices from GoFood are delivery-app prices and are usually higher than in-store prices.
-- price_idr NULL = item confirmed by a source, price not found.
-- Items per POI: P02 19, P03 14, P04 12, P05 2, P06 11, P07 7, P08 8.
-- No menu found yet: P01 Maison Bogerijen, P12 Braga Sky 1957.
-- Not applicable (not a food place): P09, P10, P11, TEST-LOCAL.
-- P05 uses the GoFood listing "Bacang Jando Braga" (Jl. Braga / Suniaraja No. 2C).
-- P08 prices come from other Bandung branches of Tiramisusu by Chocomory; the Braga
-- outlet has no online menu yet.
--
-- Idempotent: re-running updates prices/descriptions/sources of existing items.
-- Run after the migration:  psql "$DATABASE_URL" -f backend/seeds/poi_menu_items.sql
-- Undo: DELETE FROM public.poi_menu_items;  (or DROP TABLE to undo the migration too)
BEGIN;

INSERT INTO public.poi_menu_items
  (poi_id, category, name, description, price_idr, source, source_url, checked_on, sort_order)
SELECT v.poi_id, v.category, v.name, v.description, v.price_idr, v.source, v.source_url, v.checked_on, v.sort_order
FROM (VALUES
  ('P02', 'Kopi', 'Es Kopi Toko Djawa', 'Kopi susu dingin dengan gula djawa; hanya tersedia dingin.', 26000, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 0),
  ('P02', 'Kopi', 'Es Kopi Awan', 'Es kopi dengan topping foam lembut.', 31200, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 1),
  ('P02', 'Kopi', 'Es Kopi Polos', 'Es kopi tanpa gula.', 26000, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 2),
  ('P02', 'Kopi', 'Es Kopi Toko Djawa 1 Liter', NULL, 104000, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 3),
  ('P02', 'Manual Brew', 'Manual Brew Kerinci Kayu Aro', NULL, 45500, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 4),
  ('P02', 'Cokelat', 'Es Coklat Kopi', NULL, 39000, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 5),
  ('P02', 'Cokelat', 'Chocolate Iced', NULL, 32500, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 6),
  ('P02', 'Cokelat', 'Chocolate Hot', NULL, 32500, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 7),
  ('P02', 'Cokelat', 'Es Coklat 350 ml', NULL, 41600, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 8),
  ('P02', 'Cokelat', 'Es Coklat 1 Liter', NULL, 117000, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 9),
  ('P02', 'Teh', 'Hot Teh Ronde Jahe', NULL, 28600, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 10),
  ('P02', 'Teh', 'Hot Teh Limun Sereh', NULL, 28600, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 11),
  ('P02', 'Kue', 'Almond Croissant', NULL, 23400, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 12),
  ('P02', 'Kue', 'Cheese Croissant', NULL, 23400, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 13),
  ('P02', 'Kue', 'Cinnamon Roll', NULL, 23400, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 14),
  ('P02', 'Kue', 'Cheesy Brownies', NULL, 26000, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 15),
  ('P02', 'Kue', 'Donat Coklat', NULL, 13000, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 16),
  ('P02', 'Paket', 'Paket 1 (5 Es Kopi Toko Djawa)', NULL, 115000, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 17),
  ('P02', 'Paket', 'Paket 2 (5 Es Kopi Awan)', NULL, 140000, 'GoFood Kopi Toko Djawa Braga', 'https://gofood.co.id/en/bandung/restaurant/kopi-toko-djawa-braga-4d5a813e-0f98-4f75-8b76-2b714e120652', DATE '2026-11-27', 18),
  ('P03', 'Sandwich Es Krim', 'Seasalt Dark Choco & Choco Mint', 'Cookie sandwich isi es krim.', 44200, 'GoFood Sweet Cantina Braga', 'https://gofood.co.id/en/bandung/restaurant/sweet-cantina-braga-1cae680d-a30c-44cb-a166-4e9f7a00c76e', DATE '2026-11-27', 0),
  ('P03', 'Sandwich Es Krim', 'Choco Chip & Cookies N Cream', 'Cookie sandwich isi es krim.', 44200, 'GoFood Sweet Cantina Braga', 'https://gofood.co.id/en/bandung/restaurant/sweet-cantina-braga-1cae680d-a30c-44cb-a166-4e9f7a00c76e', DATE '2026-11-27', 1),
  ('P03', 'Sandwich Es Krim', 'Red Velvet & Marie Regal', 'Cookie sandwich isi es krim.', 44200, 'GoFood Sweet Cantina Braga', 'https://gofood.co.id/en/bandung/restaurant/sweet-cantina-braga-1cae680d-a30c-44cb-a166-4e9f7a00c76e', DATE '2026-11-27', 2),
  ('P03', 'Cookies', 'Cheesy Brownies Bite', NULL, 46800, 'GoFood Sweet Cantina Braga', 'https://gofood.co.id/en/bandung/restaurant/sweet-cantina-braga-1cae680d-a30c-44cb-a166-4e9f7a00c76e', DATE '2026-11-27', 3),
  ('P03', 'Cookies', 'Choco Chips', 'Cookie satuan; kisaran harga cookie Rp26.000–36.400.', NULL, 'GoFood Sweet Cantina Braga', 'https://gofood.co.id/en/bandung/restaurant/sweet-cantina-braga-1cae680d-a30c-44cb-a166-4e9f7a00c76e', DATE '2026-11-27', 4),
  ('P03', 'Cookies', 'Sea Salt Dark Choco', 'Cookie satuan; kisaran harga cookie Rp26.000–36.400.', NULL, 'GoFood Sweet Cantina Braga', 'https://gofood.co.id/en/bandung/restaurant/sweet-cantina-braga-1cae680d-a30c-44cb-a166-4e9f7a00c76e', DATE '2026-11-27', 5),
  ('P03', 'Cookies', 'Oreo Brownie Bite', 'Cookie satuan; kisaran harga cookie Rp26.000–36.400.', NULL, 'GoFood Sweet Cantina Braga', 'https://gofood.co.id/en/bandung/restaurant/sweet-cantina-braga-1cae680d-a30c-44cb-a166-4e9f7a00c76e', DATE '2026-11-27', 6),
  ('P03', 'Cookies', 'Triple Chocolate', NULL, NULL, 'GoFood Sweet Cantina Braga', 'https://gofood.co.id/en/bandung/restaurant/sweet-cantina-braga-1cae680d-a30c-44cb-a166-4e9f7a00c76e', DATE '2026-11-27', 7),
  ('P03', 'Cookies', 'Ube Oreo', NULL, NULL, 'GoFood Sweet Cantina Braga', 'https://gofood.co.id/en/bandung/restaurant/sweet-cantina-braga-1cae680d-a30c-44cb-a166-4e9f7a00c76e', DATE '2026-11-27', 8),
  ('P03', 'Cookies', 'Dark Choco Confetti', NULL, NULL, 'GoFood Sweet Cantina Braga', 'https://gofood.co.id/en/bandung/restaurant/sweet-cantina-braga-1cae680d-a30c-44cb-a166-4e9f7a00c76e', DATE '2026-11-27', 9),
  ('P03', 'Rasa Es Krim', 'Bubble Gum', NULL, NULL, 'Wanderlog Sweet Cantina', 'https://wanderlog.com/place/details/1558267', DATE '2026-11-27', 10),
  ('P03', 'Rasa Es Krim', 'Cookies n'' Cream', NULL, NULL, 'Wanderlog Sweet Cantina', 'https://wanderlog.com/place/details/1558267', DATE '2026-11-27', 11),
  ('P03', 'Rasa Es Krim', 'Marie Regal', NULL, NULL, 'Wanderlog Sweet Cantina', 'https://wanderlog.com/place/details/1558267', DATE '2026-11-27', 12),
  ('P03', 'Rasa Es Krim', 'Mint Choco', NULL, NULL, 'Wanderlog Sweet Cantina', 'https://wanderlog.com/place/details/1558267', DATE '2026-11-27', 13),
  ('P04', 'Roti', 'Roti Gambang', NULL, 9500, 'GoFood Canary Bakery (Jl. Braga 16)', 'https://gofood.co.id/en/bandung/restaurant/canary-bakery-2fb5d1c7-60fc-4c69-9b9a-784b44fa9a8f', DATE '2026-11-27', 0),
  ('P04', 'Roti', 'Pisang Bolen Lilit', NULL, 19000, 'GoFood Canary Bakery (Jl. Braga 16)', 'https://gofood.co.id/en/bandung/restaurant/canary-bakery-2fb5d1c7-60fc-4c69-9b9a-784b44fa9a8f', DATE '2026-11-27', 1),
  ('P04', 'Bolen', 'Bolen Kecil', NULL, 45000, 'GoFood Canary Bakery And Cafe (Jl. Braga 16)', 'https://gofood.co.id/en/bandung/restaurant/canary-bakery-and-cafe-f10cbcd0-0dc9-4b95-afcd-5bfc9bee9957', DATE '2026-11-27', 2),
  ('P04', 'Bolen', 'Bolen Besar', NULL, 60000, 'GoFood Canary Bakery And Cafe (Jl. Braga 16)', 'https://gofood.co.id/en/bandung/restaurant/canary-bakery-and-cafe-f10cbcd0-0dc9-4b95-afcd-5bfc9bee9957', DATE '2026-11-27', 3),
  ('P04', 'Brownies', 'Brownies Coklat', NULL, 40000, 'GoFood Canary Bakery And Cafe (Jl. Braga 16)', 'https://gofood.co.id/en/bandung/restaurant/canary-bakery-and-cafe-f10cbcd0-0dc9-4b95-afcd-5bfc9bee9957', DATE '2026-11-27', 4),
  ('P04', 'Brownies', 'Brownies Tutti Frutti', NULL, 40000, 'GoFood Canary Bakery And Cafe (Jl. Braga 16)', 'https://gofood.co.id/en/bandung/restaurant/canary-bakery-and-cafe-f10cbcd0-0dc9-4b95-afcd-5bfc9bee9957', DATE '2026-11-27', 5),
  ('P04', 'Brownies', 'Brownies Almond', NULL, 45000, 'GoFood Canary Bakery And Cafe (Jl. Braga 16)', 'https://gofood.co.id/en/bandung/restaurant/canary-bakery-and-cafe-f10cbcd0-0dc9-4b95-afcd-5bfc9bee9957', DATE '2026-11-27', 6),
  ('P04', 'Brownies', 'Brownies Tiramisu', NULL, 45000, 'GoFood Canary Bakery And Cafe (Jl. Braga 16)', 'https://gofood.co.id/en/bandung/restaurant/canary-bakery-and-cafe-f10cbcd0-0dc9-4b95-afcd-5bfc9bee9957', DATE '2026-11-27', 7),
  ('P04', 'Brownies', 'Brownies Kukus Coklat', NULL, 62000, 'GoFood Canary Bakery (Jl. Braga 16)', 'https://gofood.co.id/en/bandung/restaurant/canary-bakery-2fb5d1c7-60fc-4c69-9b9a-784b44fa9a8f', DATE '2026-11-27', 8),
  ('P04', 'Brownies', 'Brownies Panggang', NULL, 75900, 'GoFood Canary Bakery (Jl. Braga 16)', 'https://gofood.co.id/en/bandung/restaurant/canary-bakery-2fb5d1c7-60fc-4c69-9b9a-784b44fa9a8f', DATE '2026-11-27', 9),
  ('P04', 'Es Krim', 'Es Krim 1 Scoop', 'Tersedia 6 pilihan rasa (data 2022).', 22000, 'detikJabar (Jun 2022)', 'https://www.detik.com/jabar/kuliner/d-6116849/tempat-jajan-di-jalan-braga-bandung-resepnya-dari-zaman-belanda', DATE '2026-11-27', 10),
  ('P04', 'Es Krim', 'Es Krim 2 Scoop', 'Tersedia 6 pilihan rasa (data 2022).', 33000, 'detikJabar (Jun 2022)', 'https://www.detik.com/jabar/kuliner/d-6116849/tempat-jajan-di-jalan-braga-bandung-resepnya-dari-zaman-belanda', DATE '2026-11-27', 11),
  ('P05', 'Bacang', 'Bacang Jando Panas', 'Bacang dengan topping daging cincang dan lemak sapi (jando).', 18000, 'GoFood Bacang Jando Braga (Suniaraja 2C)', 'https://gofood.co.id/en/bandung/restaurant/bacang-jando-braga-jl-braga-suniaraja-no-2c-5f6914a5-2d08-4a6b-bcb5-cc278c2753a3', DATE '2026-11-27', 0),
  ('P05', 'Dimsum', 'Dimsum (siomay, pangsit, bapao)', NULL, 25000, 'GoFood Bacang Jando Braga (Suniaraja 2C)', 'https://gofood.co.id/en/bandung/restaurant/bacang-jando-braga-jl-braga-suniaraja-no-2c-5f6914a5-2d08-4a6b-bcb5-cc278c2753a3', DATE '2026-11-27', 1),
  ('P06', 'Western', 'Spaghetti Braga Art Cafe', NULL, 38000, 'GoFood Braga Art Cafe', 'https://gofood.co.id/en/bandung/restaurant/braga-art-cafe-braga-0d6298b8-8410-4a35-ae8d-5ea212a57453', DATE '2026-11-27', 0),
  ('P06', 'Western', 'Spaghetti Bolognese', NULL, 35000, 'GoFood Braga Art Cafe', 'https://gofood.co.id/en/bandung/restaurant/braga-art-cafe-braga-0d6298b8-8410-4a35-ae8d-5ea212a57453', DATE '2026-11-27', 1),
  ('P06', 'Western', 'Tenderloin Steak', NULL, 68000, 'GoFood Braga Art Cafe', 'https://gofood.co.id/en/bandung/restaurant/braga-art-cafe-braga-0d6298b8-8410-4a35-ae8d-5ea212a57453', DATE '2026-11-27', 2),
  ('P06', 'Indonesian', 'Sop Buntut', NULL, 52000, 'GoFood Braga Art Cafe', 'https://gofood.co.id/en/bandung/restaurant/braga-art-cafe-braga-0d6298b8-8410-4a35-ae8d-5ea212a57453', DATE '2026-11-27', 3),
  ('P06', 'Indonesian', 'Sop Buntut Bakar', NULL, 56000, 'GoFood Braga Art Cafe', 'https://gofood.co.id/en/bandung/restaurant/braga-art-cafe-braga-0d6298b8-8410-4a35-ae8d-5ea212a57453', DATE '2026-11-27', 4),
  ('P06', 'Indonesian', 'Kupat Tahu', NULL, 22000, 'GoFood Braga Art Cafe', 'https://gofood.co.id/en/bandung/restaurant/braga-art-cafe-braga-0d6298b8-8410-4a35-ae8d-5ea212a57453', DATE '2026-11-27', 5),
  ('P06', 'Green Smoothies', 'Banana Green', NULL, 26000, 'GoFood Braga Art Cafe', 'https://gofood.co.id/en/bandung/restaurant/braga-art-cafe-braga-0d6298b8-8410-4a35-ae8d-5ea212a57453', DATE '2026-11-27', 6),
  ('P06', 'Green Smoothies', 'Orange Green Light', NULL, 26000, 'GoFood Braga Art Cafe', 'https://gofood.co.id/en/bandung/restaurant/braga-art-cafe-braga-0d6298b8-8410-4a35-ae8d-5ea212a57453', DATE '2026-11-27', 7),
  ('P06', 'Green Smoothies', 'Camuflage Avocado', NULL, 28000, 'GoFood Braga Art Cafe', 'https://gofood.co.id/en/bandung/restaurant/braga-art-cafe-braga-0d6298b8-8410-4a35-ae8d-5ea212a57453', DATE '2026-11-27', 8),
  ('P06', 'Green Smoothies', 'Green Pineapple', NULL, 28000, 'GoFood Braga Art Cafe', 'https://gofood.co.id/en/bandung/restaurant/braga-art-cafe-braga-0d6298b8-8410-4a35-ae8d-5ea212a57453', DATE '2026-11-27', 9),
  ('P06', 'Green Smoothies', 'Mango Green', NULL, 28000, 'GoFood Braga Art Cafe', 'https://gofood.co.id/en/bandung/restaurant/braga-art-cafe-braga-0d6298b8-8410-4a35-ae8d-5ea212a57453', DATE '2026-11-27', 10),
  ('P07', 'Menu Legendaris', 'Poffertjes', 'Pancake bulat kecil bertabur gula halus dengan saus vanila.', NULL, 'PergiKuliner (ulasan 2018)', 'https://pergikuliner.com/reviews/1238443316/images/1633006', DATE '2026-11-27', 0),
  ('P07', 'Menu Legendaris', 'Bitterballen', NULL, NULL, 'Jabarprov (seabad Braga Permai, 2023)', 'https://jabarprov.go.id/en/berita/seabad-kisah-braga-permai-jadi-restoran-legendaris-di-kota-bandung-11200', DATE '2026-11-27', 1),
  ('P07', 'Menu Legendaris', 'Steak Lidah (Beef Tongue Steak)', NULL, NULL, 'Wanderlog Braga Permai', 'https://wanderlog.com/place/details/752294', DATE '2026-11-27', 2),
  ('P07', 'Menu Legendaris', 'Salmon Wellington', NULL, NULL, 'Wanderlog Braga Permai', 'https://wanderlog.com/place/details/752294', DATE '2026-11-27', 3),
  ('P07', 'Menu Legendaris', 'Almond Cinnamon Cake', NULL, NULL, 'Wanderlog Braga Permai', 'https://wanderlog.com/place/details/752294', DATE '2026-11-27', 4),
  ('P07', 'Menu Legendaris', 'Coconut Royale', 'Menu andalan; harga menu legendaris berkisar Rp15.000–55.000.', NULL, 'Metro TV News', 'https://www.metrotvnews.com/read/N9nCyzrP-bukan-cuma-estetik-ini-5-surga-kuliner-legendaris-di-braga-yang-wajib-dicoba', DATE '2026-11-27', 5),
  ('P07', 'Menu Legendaris', 'Saucijzenbrood', 'Roti isi sosis khas Belanda; harga menu legendaris berkisar Rp15.000–55.000.', NULL, 'Metro TV News', 'https://www.metrotvnews.com/read/N9nCyzrP-bukan-cuma-estetik-ini-5-surga-kuliner-legendaris-di-braga-yang-wajib-dicoba', DATE '2026-11-27', 6),
  ('P08', 'Tiramisu', 'Tiramisusu Original', 'Enam lapis sponge cokelat dan vanila, sirup kopi, krim, dan milk crumble.', 111000, 'GoFood Tiramisusu by Chocomory Buah Batu (cabang lain)', 'https://gofood.co.id/en/bandung/restaurant/tiramisusu-by-chocomory-buah-batu-bf415cb9-77f9-493f-9ae3-464317122391', DATE '2026-11-27', 0),
  ('P08', 'Tiramisu', 'Tiramisusu Cookies and Cream', NULL, 111000, 'GoFood Tiramisusu by Chocomory Buah Batu (cabang lain)', 'https://gofood.co.id/en/bandung/restaurant/tiramisusu-by-chocomory-buah-batu-bf415cb9-77f9-493f-9ae3-464317122391', DATE '2026-11-27', 1),
  ('P08', 'Tiramisu', 'Tiramisusu Matcha', NULL, NULL, 'GoFood Tiramisusu by Chocomory Buah Batu (cabang lain)', 'https://gofood.co.id/en/bandung/restaurant/tiramisusu-by-chocomory-buah-batu-bf415cb9-77f9-493f-9ae3-464317122391', DATE '2026-11-27', 2),
  ('P08', 'Kue', 'MooMooRoll Double Choco', NULL, 111000, 'GoFood Tiramisusu by Chocomory Anggrek (cabang lain)', 'https://gofood.co.id/en/bandung/restaurant/tiramisusu-by-chocomory-anggrek-0fc2d32a-5d04-49fe-a029-56a6e60da264', DATE '2026-11-27', 3),
  ('P08', 'Kue', 'Crispy Brownie Almond', NULL, 83500, 'GoFood Tiramisusu by Chocomory Anggrek (cabang lain)', 'https://gofood.co.id/en/bandung/restaurant/tiramisusu-by-chocomory-anggrek-0fc2d32a-5d04-49fe-a029-56a6e60da264', DATE '2026-11-27', 4),
  ('P08', 'Oleh-oleh', 'Chocomory Pie isi 5', 'Sekitar Rp36.000 di cabang Paskal.', NULL, 'GoFood Tiramisusu by Chocomory Paskal (cabang lain)', 'https://gofood.co.id/en/bandung/restaurant/tiramisusu-by-chocomory-paskal-43580efe-0561-4846-8c38-f5586b5bebbe', DATE '2026-11-27', 5),
  ('P08', 'Oleh-oleh', 'Mini Choco Bar', 'Kisaran Rp16.000–21.000.', NULL, 'GoFood Tiramisusu by Chocomory Buah Batu (cabang lain)', 'https://gofood.co.id/en/bandung/restaurant/tiramisusu-by-chocomory-buah-batu-bf415cb9-77f9-493f-9ae3-464317122391', DATE '2026-11-27', 6),
  ('P08', 'Es Krim', 'Snow Mountain (soft serve)', 'Es krim soft serve dalam kotak dengan taburan; terlihat di foto outlet Braga, harga belum diketahui.', NULL, 'Foto outlet Braga (bucket poi-images)', NULL, DATE '2026-11-27', 7)
) AS v(poi_id, category, name, description, price_idr, source, source_url, checked_on, sort_order)
WHERE EXISTS (SELECT 1 FROM public.pois p WHERE p.id = v.poi_id)
ON CONFLICT (poi_id, category, name) DO UPDATE SET
  description = EXCLUDED.description,
  price_idr = EXCLUDED.price_idr,
  source = EXCLUDED.source,
  source_url = EXCLUDED.source_url,
  checked_on = EXCLUDED.checked_on,
  sort_order = EXCLUDED.sort_order;

COMMIT;
