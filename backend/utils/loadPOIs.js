const fs = require('fs');
const path = require('path');

function detectDelimiter(headerLine) {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

function parseCsvLine(line, delimiter = ',') {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function loadPoisFromCsv() {
  const csvPath = path.join(__dirname, '..', '..', 'data', 'dataset_poi_braga_pb03.csv');
  const raw = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter);

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line, delimiter);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });

    return {
      ...row,
      id: row.id || `P${String(index + 1).padStart(2, '0')}`,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      radius_meters: parseInt(row.radius_meters || '10', 10),
      cooldown_seconds: parseInt(row.cooldown_seconds || '300', 10),
      avg_duration_minutes: parseInt(row.avg_duration_minutes || '30', 10),
      price_min: parseInt(row.price_min || '0', 10),
      price_max: parseInt(row.price_max || '0', 10),
      rating: parseFloat(row.rating || '4.5'),
      reviews_count: parseInt(row.reviews_count || '0', 10),
    };
  });
}

module.exports = loadPoisFromCsv;