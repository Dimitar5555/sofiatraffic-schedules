import { stops_url, osm_stops_types, osm_network_name } from "./config.js";
import { fetch_data_from_sofiatraffic } from "./build_utilities.js";
import fs from 'fs';
import { save_all_data } from "./build_utilities.js";

function round_stop_coords(lat, lon) {
	// 5 digits give precission of 1.1 meters
	const toFixed = n => Math.round(n * 1e5) / 1e5;
	return [
		toFixed(lat),
		toFixed(lon)
	];
}

async function fetch_sumc_stops() {
	// let stops_bg = fetch(`${old_stops_url}resources/stops-bg.json`)
	// .then(response => response.json());
	// let stops_en = fetch(`${old_stops_url}resources/stops-en.json`)
	// .then(response => response.json());
	// return Promise.all([stops_bg, stops_en, new_stops]);
	console.time('Fetching SUMC stops data');
	let stops = await fetch_data_from_sofiatraffic(stops_url)
	.then(response => response.json());
	console.timeEnd('Fetching SUMC stops data');
	return stops;
}

function process_sumc_stops(sumc_stops) {
	console.time('Processing SUMC stops data');
	const result = sumc_stops
	.filter(stop => stop.code && stop.code.length === 4)
	.map(stop => ({
		code: Number(stop.code),
		coords: round_stop_coords(stop.latitude, stop.longitude),
		names: {
			bg: stop.name.toUpperCase().trim().replaceAll('  ', ' '),
			en: ''
		},
		route_indexes: new Set()
	}));
	console.timeEnd('Processing SUMC stops data');
	return result;
}

async function fetch_osm_stops() {
	console.time('Fetching OSM stops data');
	const elements = osm_stops_types.map(type => `node[${type.type}=yes][public_transport=${type.public_transport}][ref][network="${osm_network_name}"];`).join('');
	const query = '[out:json][timeout:25];'
	+ `(${elements});`
	+ 'out geom;';
	const req = await fetch("https://overpass-api.de/api/interpreter", {
		"body": `data=${encodeURIComponent(query)}`,
		"method": "POST",
	})
	.then(response => response.json())
	.then(data => data.elements);
	console.timeEnd('Fetching OSM stops data');
	return req;
}

function process_osm_stops(osm_stops) {
	console.time('Processing OSM stops data');
	const result = osm_stops
	.map(osm_stop => {
		const stop = {
			code: Number(osm_stop.tags.ref),
			coords: round_stop_coords(osm_stop.lat, osm_stop.lon),
			names: {
				bg: '',
				en: ''
			},
			route_indexes: new Set()
		};
		if(!osm_stop.tags.name || osm_stop.tags?.noname === 'yes') {
			stop.names.bg = '(БЕЗИМЕННА СПИРКА)';
		}
		else {
			stop.names.bg = osm_stop.tags.name.toUpperCase().trim().replaceAll('  ', ' ');
		}

		if(osm_stop.tags['name:en']) {
			stop.names.en = osm_stop.tags['name:en'].toUpperCase().trim().replaceAll('  ', ' ');
		}
		else {
			delete stop.names.en;
		}

		if(osm_stop.tags?.request_stop === 'yes') {
			stop.names.bg += ' (ПО ЖЕЛАНИЕ)';
			if(stop.names.en) {
				stop.names.en += ' (ON DEMAND)';
			}
		}

		return stop;
	});
	console.timeEnd('Processing OSM stops data');
	return result;
}

function merge_stops(sumc_stops, osm_stops) {
	const stops = new Map();
	sumc_stops.forEach(stop => {
		stops.set(stop.code, stop);
	});

	osm_stops.forEach(osm_stop => {
		const code = osm_stop.code;
		
		if(!stops.has(code)) {
			stops.set(code, osm_stop);
		}
		else {
			const stop = stops.get(code);

			const sumc_on_demand = stop.names.bg.includes('ПО ЖЕЛАНИЕ');
			const osm_on_demand = osm_stop.names.bg.includes('ПО ЖЕЛАНИЕ');
			if(sumc_on_demand !== osm_on_demand) {
				console.warn(`Спирка с код ${code} има статус "по желание" според ${sumc_on_demand ? 'ЦГМ' : 'OSM'}, но не и в ${sumc_on_demand ? 'OSM' : 'ЦГМ'}.`);
			}

			stop.coords = osm_stop.coords;
			stop.names.bg = osm_stop.names.bg;
			stop.names.en = osm_stop.names.en;
		}
	});
	return stops;
}

function run() {
    const sumc_stops = fetch_sumc_stops()
	.then(data => process_sumc_stops(data));
	const osm_stops = fetch_osm_stops()
	.then(data => process_osm_stops(data));

    return Promise.all([sumc_stops, osm_stops])
    .then(([sumc_stops, osm_stops]) => {
		console.time('Merging stops data');

        const merged_stops = merge_stops(sumc_stops, osm_stops);

		const directions = JSON.parse(fs.readFileSync('./data/directions.json'));
		const trips = JSON.parse(fs.readFileSync('./data/trips.json'));
		for(const direction of directions) {
			const route_index = trips.find(trip => trip.direction == direction.code).route_index;
			for(const stop_code of direction.stops) {
				const stop = merged_stops.get(stop_code);
				if(stop) {
					if(!stop.route_indexes.has(route_index)) {
						stop.route_indexes.add(route_index);
					}
				}
			}
		}

		const final_stops = Array.from(merged_stops.values())
			.filter(stop => stop.route_indexes.size > 0)
			.map(stop => { delete stop.route_indexes; return stop; });
		final_stops.sort((a, b) => a.code - b.code);

		console.timeEnd('Merging stops data');

		save_all_data([
			{
				name: 'stops',
				data: final_stops,
				split_rows_by: /,({"code)/g
			},
		]);
    });
}

run();
