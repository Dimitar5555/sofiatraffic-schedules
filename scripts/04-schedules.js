import fs from 'fs'
import csvtojson from 'csvtojson'

async function run() {
    const routes = JSON.parse(fs.readFileSync('./data/routes.json'));
    const stops = JSON.parse(fs.readFileSync('./data/stops.json'));
    const active_service_ids = new Map(JSON.parse(fs.readFileSync('./data/active_service_ids.json')));
    console.log('Loaded preprocessed data.');

    const gtfs_trips = (await csvtojson().fromFile('./gtfs/trips.txt'))
        .filter(trip => active_service_ids.has(trip.service_id));
    const gtfs_stop_times = (await csvtojson().fromFile('./gtfs/stop_times.txt'))
        .map(st => ({ ...st, stop_id: st.stop_id.startsWith('M') ? st.stop_id : st.stop_id.replace(/\D/g, '').padStart(4, '0') }))
        .reduce((acc, st) => {
            if(!acc.has(st.trip_id)) {
                acc.set(st.trip_id, []);
            }
            acc.get(st.trip_id).push(st);
            return acc;
        }, new Map());
    console.log('Loaded GTFS data.');

    const trips = [];
    const directions = [];
    const stop_times = [];
    let trip_counter = 0;
    let startTime = Date.now();
    for(const trip of gtfs_trips) {
        trip_counter++;
        if(trip_counter % 5000 === 0) {
            console.log(`Processed ${trip_counter}/${gtfs_trips.length} trips, took ${(Date.now() - startTime) / 1000} s...`);
            startTime = Date.now();
        }

        const trip_stop_times = gtfs_stop_times.get(trip.trip_id) || [];
        const trip_stops = trip_stop_times.map(st => st.stop_id);
        const route_sumc_id = trip.route_id;
        const is_weekend_trip = active_service_ids.get(trip.service_id);

        let corresponding_direction = directions.find(d => 
            d.stops.length === trip_stops.length &&
            d.stops.every((s, index) => trip_stops.indexOf(s) === index));
        if(!corresponding_direction) {
            corresponding_direction = {
                code: directions.length + 1,
                stops: trip_stops,
            };
            directions.push(corresponding_direction);
        }

        let corresponding_trip = trips.find(t => 
            t.cgm_id === route_sumc_id &&
            t.direction === corresponding_direction.code &&
            t.is_weekend === is_weekend_trip
        );
        if(!corresponding_trip) {
            corresponding_trip = {
                id: trips.length + 1,
                cgm_id: route_sumc_id,
                direction: corresponding_direction.code,
                is_weekend: is_weekend_trip
            };
            trips.push(corresponding_trip);
        }

        const car = trip.trip_id.startsWith('M') ? trip.trip_id.split('-').at(2) : trip.trip_id.split('-').at(-3);
        const new_stop_times = {
            trip: corresponding_trip.id,
            times: trip_stop_times
                .map(st => st.departure_time)
                .map(time => time.split(':').map(Number))
                .map(([h, m, s]) => h * 60 + m ),
            car
        };
        stop_times.push(new_stop_times);
    }


    for(const route of routes) {
        // merge partial trips if possible
        const route_trips = trips.filter(t => t.cgm_id === route.cgm_id);
        const direction_ids = route_trips.map(t => t.direction);
        const route_dirs = directions.filter(d => direction_ids.includes(d.code))
            .sort((a, b) => b.stops.length - a.stops.length);

        for(const [index1, child] of route_dirs.entries()) {
            const parent = route_dirs.find((d, index2) => 
                d.stops.join(',').includes(child.stops.join(',')) &&
                index2 != index1 &&
                !d.is_deleted
            );
            if(!parent) {
                continue;
            }
            const needed_empty_begg_slots = parent.stops.indexOf(child.stops[0]);
            const needed_empty_end_slots = parent.stops.length - needed_empty_begg_slots - child.stops.length;
            child.is_deleted = true;
            for(const trip of route_trips) {
                if(trip.direction !== child.code) {
                    continue;
                }
                const trip_stop_times = stop_times.filter(st => st.trip === trip.id);
                for(const st of trip_stop_times) {
                    st.times = [
                        ...Array(needed_empty_begg_slots).fill(null),
                        ...st.times,
                        ...Array(needed_empty_end_slots).fill(null)
                    ];
                }
                trip.direction = parent.code;
            }
        }

        for(let i = directions.length - 1; i >= 0; i--) {
            if(directions[i].is_deleted) {
                directions.splice(i, 1);
            }
        }

        // merge trips if possible
        const route_trips_after_dir_merge = trips.filter(t => t.cgm_id === route.cgm_id);
        for(const [index1, trip] of route_trips_after_dir_merge.entries()) {
            const same = route_trips_after_dir_merge.find((t, index2) => 
                t.direction === trip.direction &&
                t.is_weekend === trip.is_weekend &&
                index2 != index1 &&
                !t.is_deleted
            );
            if(!same) {
                continue;
            }
            const trip_stop_times = stop_times.filter(st => st.trip === trip.id);
            const same_stop_times = stop_times.filter(st => st.trip === same.id);
            for(const st of trip_stop_times) {
                st.trip = same.id;
                same_stop_times.push(st);
            }
            trip.is_deleted = true;
        }

        for(let i = trips.length - 1; i >= 0; i--) {
            if(trips[i].is_deleted) {
                trips.splice(i, 1);
            }
        }
    }
    fs.writeFileSync('./data/trips.json', JSON.stringify(trips, null, 2) + '\n', 'utf-8');
    fs.writeFileSync('./data/directions.json', JSON.stringify(directions, null, 2) + '\n', 'utf-8');
    fs.writeFileSync('./data/stop_times.json', JSON.stringify(stop_times, null, 2) + '\n', 'utf-8');
}

await run();
