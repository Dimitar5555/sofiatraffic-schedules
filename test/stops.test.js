import fs from 'fs';

describe('stops', () => {
    test('should have unique code for each stop', () => {
        const data = JSON.parse(fs.readFileSync('./data/stops.json'));
        const stops_set = new Set();
        data.forEach(stop => {
            expect(stops_set.has(stop.code))
            .toBe(false, `Duplicate stop code ${stop.code}`);
            stops_set.add(stop.code);
        });
    });
});
