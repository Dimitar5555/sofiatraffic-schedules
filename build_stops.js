import { stops_url } from "./config.js";
import { fetch_data_from_sofiatraffic } from "./build_utilities.js";

function fetch_stops_data() {
	// let stops_bg = fetch(`${old_stops_url}resources/stops-bg.json`)
	// .then(response => response.json());
	// let stops_en = fetch(`${old_stops_url}resources/stops-en.json`)
	// .then(response => response.json());
	let stops = fetch_data_from_sofiatraffic(stops_url)
	.then(response => response.json());
	return stops;
	return Promise.all([stops_bg, stops_en, new_stops]);
}

function round_stop_coords(lat, lon) {
	// 5 digits give precission of 1.1 meters
	let toFixed = n => Number(Number(n).toFixed(5));
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
	stops.forEach(new_cgm_stop => {
		// let proc_stop = processed_stops.find(stop => stop.code == Number(new_cgm_stop.code));
		if(new_cgm_stop.code.length === 4) {
			processed_stops.push({
				code: Number(new_cgm_stop.code),
				coords: round_stop_coords(new_cgm_stop.latitude, new_cgm_stop.longitude),
				names: {
					bg: new_cgm_stop.name.toUpperCase()
				}
			});
		}
	});
	return processed_stops;
}

function fetch_osm_stops_data() {
	const query = '[out:json][timeout:25];'
	+ '('
	+ 'node[subway=yes][public_transport=stop_position][ref][network="Градски транспорт София"];'
	+ 'node[tram=yes][public_transport=stop_position][ref][network="Градски транспорт София"];'
	+ 'node[bus=yes][public_transport=platform][ref][network="Градски транспорт София"];'
	+ 'node[trolleybus=yes][public_transport=platform][ref][network="Градски транспорт София"];'
	+ ');'
	+ 'out geom;';
	let req = fetch("https://overpass.kumi.systems/api/interpreter", {
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
		if(!stop_to_override){
			cgm_stops.push({
				code: Number(osm_stop.tags.ref),
				coords: round_stop_coords(osm_stop.lat, osm_stop.lon),
				names: {
					bg: osm_stop.tags.name.toUpperCase()
				}
			});
		}
		else if(osm_stop.tags.tram) {
			stop_to_override.coords = round_stop_coords(osm_stop.lat, osm_stop.lon)
		}
	});
}

export function get_stops_data() {
    let cgm_stops = fetch_stops_data()
	.then(data => process_stops_data(data))
	let osm_stops = fetch_osm_stops_data();
    return Promise.all([cgm_stops, osm_stops])
    .then(([stops, osm_stops]) => {
        process_osm_stops_data(stops, osm_stops);
		stops.sort((a, b) => a.code - b.code);
        return stops;
    });
}