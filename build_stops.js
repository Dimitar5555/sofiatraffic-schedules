import { stops_url, osm_stops_types, osm_network_name } from "./config.js";
import { fetch_data_from_sofiatraffic } from "./build_utilities.js";
import fs from 'fs';
import { save_all_data } from "./build_utilities.js";

function fetch_stops_data() {
	// let stops_bg = fetch(`${old_stops_url}resources/stops-bg.json`)
	// .then(response => response.json());
	// let stops_en = fetch(`${old_stops_url}resources/stops-en.json`)
	// .then(response => response.json());
	console.log('Fetching stops data from SUMC...');
	let stops = fetch_data_from_sofiatraffic(stops_url)
	.then(response => response.json());
	return stops;
	return Promise.all([stops_bg, stops_en, new_stops]);
}

function round_stop_coords(lat, lon) {
	// 5 digits give precission of 1.1 meters
	const toFixed = n => Math.round(n * 1e5) / 1e5;
	return [
		toFixed(lat),
		toFixed(lon)
	];
}

function process_stops_data(stops) {
	let processed_stops = [];
	// stops_bg.forEach(stop => {
	// 	processed_stops.push({code: Number(stop.c), coords: round_stop_coords(stop.y, stop.x), names: {bg: stop.n}});
	// });
	// stops_en.forEach(cgm_stop => {
	// 	processed_stops[processed_stops.findIndex(stop => stop.code === Number(cgm_stop.c))].names.en = cgm_stop.n;
	// });
	console.log('Processing stops data...');
	stops.forEach(new_cgm_stop => {
		// let proc_stop = processed_stops.find(stop => stop.code == Number(new_cgm_stop.code));
		if(new_cgm_stop.code.length === 4) {
			processed_stops.push({
				code: Number(new_cgm_stop.code),
				coords: round_stop_coords(new_cgm_stop.latitude, new_cgm_stop.longitude),
				names: {
					bg: new_cgm_stop.name.toUpperCase().trim().replaceAll('  ', ' '),
					en: ''
				}
			});
		}
	});
	return processed_stops;
}

function fetch_osm_stops_data() {
	console.log('Fetching stops data from OSM...');
	const elements = osm_stops_types.map(type => `node[${type.type}=yes][public_transport=${type.public_transport}][ref][network="${osm_network_name}"];`).join('');
	const query = '[out:json][timeout:25];'
	+ `(${elements});`
	+ 'out geom;';
	let req = fetch("https://overpass-api.de/api/interpreter", {
		"body": `data=${encodeURIComponent(query)}`,
		"method": "POST",
	})
	.then(response => response.json())
	.then(data => data.elements);
	return req;
}

function process_osm_stops_data(cgm_stops, osm_stops) {
	osm_stops.forEach(osm_stop => {
		let stop_to_override = cgm_stops.find(cgm_stop => cgm_stop.code == osm_stop.tags.ref);
		
		if(!osm_stop.tags.name && osm_stop.tags?.request_stop === 'yes') {
			osm_stop.tags.name = 'по желание';
		}
		
		if(osm_stop.tags['name:en']) {
			console.log(`${osm_stop.tags.ref} ${osm_stop.tags.name} ${osm_stop.tags['name:en']}`);
		}

		if(!stop_to_override){
			cgm_stops.push({
				code: Number(osm_stop.tags.ref),
				coords: round_stop_coords(osm_stop.lat, osm_stop.lon),
				names: {
					bg: osm_stop.tags.name.toUpperCase(),
					en: ''
				}
			});
			stop_to_override = cgm_stops[cgm_stops.length - 1];
		}
		if(osm_stop.tags.tram === 'yes' || osm_stop.tags.trolleybus === 'yes') {
			stop_to_override.coords = round_stop_coords(osm_stop.lat, osm_stop.lon);
		}
		stop_to_override.names.en = osm_stop.tags['name:en']?.toUpperCase();
	});
}

export function get_stops_data() {
    let cgm_stops = fetch_stops_data()
	.then(data => process_stops_data(data))
	let osm_stops = fetch_osm_stops_data();
    return Promise.all([cgm_stops, osm_stops])
    .then(([stops, osm_stops]) => {
		console.log('All data is downloaded');
        process_osm_stops_data(stops, osm_stops);
		stops.sort((a, b) => a.code - b.code);

		// add route indexes to stops
		stops.forEach(stop => {
			stop.route_indexes = [];
		});

		const directions = JSON.parse(fs.readFileSync('./docs/data/directions.json'));
		const trips = JSON.parse(fs.readFileSync('./docs/data/trips.json'));
		for(const direction of directions) {
			const route_index = trips.find(trip => trip.direction == direction.code).route_index;
			for(const stop_code of direction.stops) {
				const stop = stops.find(stop => stop.code == stop_code);
				if(stop) {
					if(!stop.route_indexes.includes(route_index)) {
						stop.route_indexes.push(route_index);
					}
				}
			}
		}

		stops.forEach(stop => {
			stop.route_indexes.sort((a, b) => a - b);
		});

		// console.table(stops);
		save_all_data([
			{
				name: 'stops',
				data: stops.filter(stop => stop.route_indexes.length > 0),
				split_rows_by: /,({"code)/g
			},
		]);

        return stops;
    });
}

get_stops_data();