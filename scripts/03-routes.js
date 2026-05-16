import fs from 'fs'
import csv from 'csvtojson'

export async function parse_routes() {
    const text = fs.readFileSync('./gtfs/routes.txt', 'utf8');
    const routes = await csv().fromString(text);
    return routes;
}

function determine_route_ref(ref) {
	const number = ref.replace(/[a-zа-я]/gi, '');
    ref = ref.toUpperCase();
	//         Latin          Cyrrilic
	if(ref.startsWith('E') || ref.startsWith('Е')) {
		ref = number;
	}
	else if(ref.startsWith('N')) {
        // Night buses
		ref = `N${number}`;
	}
	else if(ref.startsWith('Y')) {
        // School buses
		ref = `У${number}`;
	}
    else if(ref.endsWith('ТБ') || ref.endsWith('TB')) {
        // Trolleybus replacement buses
        ref = `${number}ТБ`;
    }
    else if(ref.endsWith('ТМ') || ref.endsWith('TM') || ref.endsWith('Т') || ref.endsWith('T')) {
        // Tram replacement buses
        ref = `${number}ТМ`;
    }
	return ref;
}

function determine_route_type(route) {
    const ref = route.route_ref;
    if(ref.endsWith('ТБ') || ref.endsWith('ТМ') || ref.startsWith('М') && route.type === 'bus') {
        route.type = 'bus';
    }
    if(route.sort_ref >= 50 && route.type === 'trolley') {
        route.type = 'bus';
    }
    return null;
}

function preprocess_routes(routes) {
    const new_routes = [];
    const type_mapping = {
        '0': 'tram',
        '1': 'metro',
        '3': 'bus',
        '11': 'trolley'
    };
    for(const route of routes) {
        const new_route = {
            cgm_id: route.route_id,
            route_ref: determine_route_ref(route.route_short_name),
            type: type_mapping[route.route_type]
        };
        new_route.sort_ref = parseInt(new_route.route_ref.replace(/[a-zа-я]/gi, ''));
        determine_route_type(new_route);
        if(new_route.type === 'metro') {
            new_route.text_color = route.route_text_color;
            new_route.bg_color = route.route_color;
        }
        delete new_route.sort_ref;
        new_routes.push(new_route);
    }
    return new_routes;
}

function is_weekend(date) {
    const year = date.getFullYear();
    const always_weekend = [
        '01-01', // New Year's Day
        '03-03', // Liberation Day
        '01-05', // Labor Day
        '06-05', // Saint George's Day
        '24-05', // Culture and Literacy Day
        '06-09', // Unification Day
        '22-09', // Independence Day
        '01-11', // National Awakening Day
        '24-12', // Christmas Eve
        '25-12', // Christmas
        '26-12', // Christmas
    ]
    .map(d => `${year}-${d.split('-').reverse().join('-')}`);
    const day = date.getDay();
    const is_sat_or_sun = day === 0 || day === 6;
    const is_always_weekend = always_weekend.includes(date.toISOString().split('T')[0]);
    return is_sat_or_sun || is_always_weekend;
}

async function get_active_service_ids() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const calendar_dates = fs.readFileSync('./gtfs/calendar_dates.txt', 'utf8');
    const calendar_dates_json = Array.from(await csv().fromString(calendar_dates))
    .filter(cd => cd.exception_type === '1' && today <= cd.date)
    .map(cd => {
        const formatted_date = `${cd.date.slice(0, 4)}-${cd.date.slice(4, 6)}-${cd.date.slice(6)}`;
        const date = new Date(formatted_date);
        return { ...cd, date, is_weekend: is_weekend(date) };
    });

    const service_ids = new Map();
    for(const cd of calendar_dates_json) {
        if(!service_ids.has(cd.service_id)) {
            service_ids.set(cd.service_id, { weekday_count: 0, weekend_count: 0 });
        }
        const service_id_info = service_ids.get(cd.service_id);
        if(cd.is_weekend) {
            service_id_info.weekend_count++;
        }
        else {
            service_id_info.weekday_count++;
        }
    }

    service_ids.forEach((value, key) => {
        if(value.weekday_count > value.weekend_count) {
            service_ids.set(key, false);
        }
        else {
            service_ids.set(key, true);
        }
    });
    return service_ids;
}

async function get_active_routes(routes, active_service_ids) {
    const active_routes = new Set();
    const trips = fs.readFileSync('./gtfs/trips.txt', 'utf8');
    const trips_json = await csv().fromString(trips);

    for(const trip of trips_json) {
        const { service_id } = trip;
        if(!active_service_ids.has(service_id)) {
            continue;
        }
        active_routes.add(trip.route_id);
    }
    return active_routes;
}


const routes = await parse_routes();
const preprocessed_routes = preprocess_routes(routes);
// console.table(preprocessed_routes);

const active_service_ids = await get_active_service_ids();
const active_routes_ids = await get_active_routes(preprocessed_routes, active_service_ids);

const active_routes = preprocessed_routes.filter(r => active_routes_ids.has(r.cgm_id));

fs.writeFileSync('./data/routes.json', JSON.stringify(active_routes, null, 2) + '\n', 'utf-8');
fs.writeFileSync('./data/active_service_ids.json', JSON.stringify([...active_service_ids.entries()], null, 2));
