"""Regenerate the offline mobile snapshot from the canonical PB03 CSV."""
import csv
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
source = root / 'data' / 'dataset_poi_braga_pb03.csv'
target = root / 'mobile' / 'src' / 'poi' / 'pb03.snapshot.json'
with source.open(encoding='utf-8-sig', newline='') as handle:
    rows = list(csv.DictReader(handle))

def number(value):
    if not value or not value.strip():
        return None
    return float(value) if '.' in value else int(value)

records = []
for row in rows:
    records.append({
        'id': row['id'], 'name': row['name'], 'category': row['category'],
        'latitude': number(row['latitude']), 'longitude': number(row['longitude']),
        'triggerRadiusMeters': number(row['radius_meters']),
        'shortDescription': row['description'], 'description': row['description'],
        'history': row.get('history'), 'openingHours': row.get('opening_hours'),
        'menuHighlights': row.get('menu_highlights'),
        'priceMin': number(row.get('price_min')), 'priceMax': number(row.get('price_max')),
        'rating': number(row.get('rating')), 'reviewsCount': number(row.get('reviews_count')),
        'audioGuideUrl': row.get('audio_guide_url') or None,
        'notificationTitle': row.get('notification_title'),
    })
target.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Wrote {len(records)} POIs to {target.relative_to(root)}')
