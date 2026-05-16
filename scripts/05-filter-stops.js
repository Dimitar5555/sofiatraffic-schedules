import fs from 'fs';

const stops = JSON.parse(fs.readFileSync('./data/stops.json'));
const directions = JSON.parse(fs.readFileSync('./data/directions.json'));
const seen_stops = new Set();
for(const direction of directions) {
    for(const stop_code of direction.stops) {
        seen_stops.add(stop_code);
    }
}

const filtered_stops = stops.filter(stop => seen_stops.has(stop.code));
console.log(`Filtered stops: ${filtered_stops.length} / ${stops.length}`);
fs.writeFileSync('./data/stops.json', JSON.stringify(filtered_stops, null, 2) + '\n', 'utf-8');
