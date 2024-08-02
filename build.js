const fs = require('fs');
const HTMLParser = require('node-html-parser');
const crypto = require('crypto');

const protocol = "https://";
const sofiatraffic_url = "sofiatraffic.bg";
// const schedules_url = `${protocol}forum.${sofiatraffic_url}/`;
const stops_url = `${protocol}routes.${sofiatraffic_url}/`;
const routes_url = `${protocol}${sofiatraffic_url}/bg/trip/getLines`;
const schedule_url = `${protocol}${sofiatraffic_url}/bg/trip/getSchedule`;

const main_types = ['metro', 'tram', 'trolley', 'bus'];

//const init_get_polylines = require('./build_polylines.js');

var metadata = {
	app_version: '2024-08-02',
	retrieval_date: new Date().toISOString().split('T')[0],
	hashes: {}
};

const timeout = 1000; // ms

Array.prototype.find2DIndex = function(searching_for){
	var array = this.map(item => JSON.stringify(item));
	var searching_for = JSON.stringify(searching_for);
	return array.indexOf(searching_for);
};

var sofiatraffic_session_cookie;
var sofiatraffic_xsrf_token;

function parse_time(time) {
	let split = time.split(':').map(Number);
	return split[0]*60+split[1];
}

function normalise_metro_stop_codes(start_code, end_code) {
	function pad_code(code) {
		return code.toString().padStart(4, '0');
	}
	const bindings = {
		// M1 => Obelya
		'0016->0000': [
			3044, 3042, 3040, 3026, 3024, 3022, 3020, 3018, 3016, 3014, 3012, 3010, 3008, 3006, 3004, 3002, 3000
		],
		// M1 => Business Park Sofia
		'0000->0016': [
			2999, 3001, 3003, 3005, 3007, 3009, 3011, 3013, 3015, 3017, 3019, 3021, 3023, 3025, 3039, 3041, 3043
		],
		// M2 => Obelya (Slivnitsa)
		'0212->0001': [
			2975, 2977, 2979, 2981, 2983, 2985, 2987, 2989, 2991, 2993, 2995, 2997, 2999
		],
		// M2 => Vitosha
		'0001->0212': [
			3000, 2998, 2996, 2994, 2992, 2990, 2988, 2986, 2984, 2982, 2980, 2978, 2976
		],
		// M3 => Gorna banya
		// 3313 is a station between Orlov most and Teatralna, which wasn't built
		// 3325 is a station between Krasno selo and Bulgaria Blvd., which wasn't built
		'0305->0318': [
			3309, 3311, /*3313,*/ 3317, 3319, 3321, 3323, /*3325,*/ 3327, 3329, 3331, 3333, 3335
		],
		// M3 => Hadzhi Dimitar
		// 3314 is a station between Orlov most and Teatralna, which wasn't built
		// 3326 is a station between Krasno selo and Bulgaria Blvd., which wasn't built
		'0318->0305': [
			3336, 3334, 3332, 3330, 3328, /*3326,*/ 3324, 3322, 3320, 3318, 3316, /*3314,*/ 3312, 3310
		],
		// M4 => Obelya
		'0023->0000': [
			3038, 3036, 3034, 3032, 3030, 3028, 3026, 3024, 3022, 3020, 3018, 3016, 3014, 3012, 3010, 3008, 3006, 3004, 3002, 3000
		],
		// M4 => Sofia Airport
		'0000->0023': [
			2999, 3001, 3003, 3005, 3007, 3009, 3011, 3013, 3015, 3017, 3019, 3021, 3023, 3025, 3027, 3029, 3031, 3033, 3035, 3037
		]
	};
	let key = `${pad_code(start_code)}->${pad_code(end_code)}`;
	return bindings[`${pad_code(start_code)}->${pad_code(end_code)}`];
}

async function fetch_tokens() {
    let cookies_request = await fetch('https://sofiatraffic.bg/bg/public-transport');
    let cookies = cookies_request.headers.getSetCookie();
    sofiatraffic_xsrf_token = decodeURIComponent(cookies[0].split(';')[0].split('=')[1]);
    sofiatraffic_session_cookie = decodeURIComponent(cookies[1].split(';')[0].split('=')[1]);
}

function fetch_data_from_sofiatraffic(url, body={}) {
    return fetch(url, {
        "method": "POST",
        "credentials": "include",
        "headers": {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-GB,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": sofiatraffic_xsrf_token,
            "Cookie": `sofia_traffic_session=${sofiatraffic_session_cookie}`,
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "Priority": "u=1",
            "Pragma": "no-cache",
            "Cache-Control": "no-cache",
            "Referrer": "https://www.sofiatraffic.bg/bg/public-transport",
            "TE": "trailers"
        },
        "referrer": "https://www.sofiatraffic.bg/bg/public-transport",
        "body": JSON.stringify(body),
        "mode": "cors"
    });
}

function fetch_stops_data() {
	let stops_bg = fetch(`${stops_url}resources/stops-bg.json`)
	.then(response => response.json());
	let stops_en = fetch(`${stops_url}resources/stops-en.json`)
	.then(response => response.json());
	return Promise.all([stops_bg, stops_en]);
}

function process_stops_data(stops_bg, stops_en) {
	let final_stops = [];
	stops_bg.forEach(stop => {
		final_stops.push({code: Number(stop.c), coords: [stop.y, stop.x], names: {bg: stop.n}});
	});
	stops_en.forEach(cgm_stop => {
		final_stops[final_stops.findIndex(stop => stop.code === Number(cgm_stop.c))].names.en = cgm_stop.n;
	});
	final_stops.sort((a, b) => a.code-b.code);
	return final_stops;
}

function fetch_osm_stops_data() {
	let req = fetch("https://overpass.kumi.systems/api/interpreter", {
		"body": "data=%5Bout%3Ajson%5D%5Btimeout%3A25%5D%3B%0Anode%5Bsubway%3Dyes%5D%5Bpublic_transport%3Dstop_position%5D%5Bref%5D%5Bnetwork%3D%22%D0%93%D1%80%D0%B0%D0%B4%D1%81%D0%BA%D0%B8+%D1%82%D1%80%D0%B0%D0%BD%D1%81%D0%BF%D0%BE%D1%80%D1%82+%D0%A1%D0%BE%D1%84%D0%B8%D1%8F%22%5D%3B%0Aout+geom%3B",
		"method": "POST",
	})
	.then(response => response.json())
	.then(data => data.elements);
	return req;
}

function process_osm_stops_data(app_stops, osm_stops) {
	osm_stops.forEach(osm_stop => {
		let app_stop = app_stops.find(stop => stop.code == osm_stop.tags.ref);
		app_stop.coords = [osm_stop.lat, osm_stop.lon];
	});
}

function fetch_routes_data() {
	let routes = fetch_data_from_sofiatraffic(routes_url)
	.then(response => response.json());
	return routes;
}

function process_routes_data(input_routes) {
	let output_routes = [];

	input_routes.forEach(input_route => {
		let output_route = {
			temp_cgm_id: input_route.line_id,
			line: input_route.name,
			temp_ref: Number(input_route.name.replace(/[a-zа-я]/gi, ''))
		};

		let line = output_route.temp_ref == output_route.line?output_route.temp_ref:output_route.line;
		if(typeof line == 'string' && line.startsWith('Н')) {
			line = `N${output_route.temp_ref}`;
			output_route.subtype = 'night';
		}
		else if(typeof line == 'string' && line.startsWith('E')) {
			line = Number(output_route.temp_ref);
		}
		output_route.line = line;

		if(input_route.icon.includes('subway.png')){
			output_route.type = 'metro';
		}
		else if(input_route.icon.includes('tram.png')){
			output_route.type = 'tram';
		}
		else if(input_route.icon.includes('trolley.png')){
			output_route.type = 'trolley';
		}
		else if(input_route.icon.includes('bus.png')){
			output_route.type = 'bus';
		}
		else{
			console.error(`Unrecognised line type: ${input_route.icon}`);
		}

		output_routes.push(output_route);
	});

	output_routes.sort((a, b) => {
		if(a.type != b.type) {
			return main_types.indexOf(a.type)-main_types.indexOf(b.type);
		}
		if(a.subtype) {
			return 1;
		}
		if(b.subtype) {
			return -1;
		}
		return a.temp_ref - b.temp_ref;
	});
	return output_routes;
}

function fetch_schedule_data(route) {
	let schedule = fetch_data_from_sofiatraffic(schedule_url, {line_id: route.temp_cgm_id})
	.then(response => response.json());
	return schedule;
}

function process_schedule_data(data, route_index, trip_index_offset, is_metro) {
	let directions = [];
	let trips = [];
	let stop_times = [];

	// for each direction
	data.routes.forEach(route => {
		let direction_id = route.id;
		let cur_direction_index = directions.push({code: direction_id, stops: []}) - 1;
		let cur_direction_code = direction_id;
		
		// Overwrite CGM's sequence
		let cur_segment = 0;
		let next_stop_code = undefined;
		// for each segment
		for(segment of route.segments) {
			// stops are not active during construction works, ignore their times and their existance
			if(segment.stop.code != next_stop_code && next_stop_code) {
				continue;
			}
			directions[cur_direction_index].stops[cur_segment] = Number(segment.stop.code);
			// for each time in a segment
			segment.stop.times.forEach(time => {
				let stop_time = stop_times.find(st => st.code == time.id);
				if(!stop_time){
					let index = stop_times.push({times: [], code: time.id})-1;
					stop_time = stop_times[index];
					let trip_index = trips.findIndex(trip => trip.route_index == route_index && trip.direction == cur_direction_code && trip.is_weekend === (time.weekend === 1));
					if(trip_index == -1){
						trip_index = trips.push({route_index: route_index, direction: cur_direction_code, is_weekend: time.weekend === 1}) - 1;
					}
					stop_time.trip = trip_index + trip_index_offset;
				}
				stop_time.times[cur_segment] = parse_time(time.time);
			});
			next_stop_code = segment.end_stop.code;
			cur_segment++;
		}
		if(is_metro) {
			let stops_arr = directions[cur_direction_index].stops;
			let start_stop = stops_arr[0];
			let end_stop = stops_arr[stops_arr.length-1];
			directions[cur_direction_index].stops = normalise_metro_stop_codes(start_stop, end_stop);
		}
	});

	return {
		directions,
		trips,
		stop_times
	};
}

async function fetch_all_data() {
	console.log('Starting build script');
	console.log('Fetching stops data');
	let stops = fetch_stops_data()
	.then(data => process_stops_data(data[0], data[1]));
	let osm_stops = fetch_osm_stops_data();

	
	console.log('Fetching tokens');
	await fetch_tokens();
	console.log('Fetching routes data');
	let routes = fetch_routes_data()
	.then(data => process_routes_data(data));


	Promise.all([stops, routes, osm_stops])
	.then(async(data) => {
		let stops = data[0];
		let routes = data[1];
		let directions = [];
		let stop_times = [];
		let trips = [];

		process_osm_stops_data(stops, data[2]);

		let route_index = 0;
		for(route of routes) {
			await fetch_schedule_data(route)
			.then(data => process_schedule_data(data, route_index, trips.length, route.type == 'metro'))
			.then(data => {
				//push to respective arr
				console.log(`Fetching route data: ${route_index+1}/${routes.length}`)
				directions = directions.concat(data.directions);
				trips = trips.concat(data.trips);
				stop_times = stop_times.concat(data.stop_times);
			});
			route_index++;
		}

		routes.forEach(route => {
			delete route.temp_ref;
			delete route.temp_cgm_id;
		});

		let st_length = stop_times.length;
		stop_times.forEach((st, st_index) => {
			delete st.code;

			// fill empty cells at the end
			let trip = trips[st.trip];
			let dir = directions.find(d => d.code == trip.direction);
			let items_to_push = dir.stops.length - st.times.length;
			while(items_to_push>0){
				st.times.push(null);
				items_to_push--;
			}
			if(st_index%1000==0){
				console.log(`Processed ${st_index}/${st_length}`)
			}
		});
		
		var files_to_save = [
			{
				name: 'routes',
				data: routes,
				split_rows_by: /,({"line)/g
			},
			{
				name: 'trips',
				data: trips,
				split_rows_by: /,({"route_index)/g
			},
			{
				name: 'directions',
				data: directions,
				split_rows_by: /,({"code)/g
			},
			{
				name: 'stops',
				data: stops,
				split_rows_by: /,({"code)/g
			},
			{
				name: 'stop_times',
				data: stop_times,
				split_rows_by: /,({"times)/g
			}
		];
	
		await save_all_data(files_to_save);
	});
}

async function save_all_data(files_to_write) {

	String.prototype.beautifyJSON = function(find, replace=',\n$1'){
		return this
		.replace(/^\[/, '[\n')
		.replace(/\]$/, '\n]')
		.replace(find, replace)
	}
	
	for(const file of files_to_write) {
		console.log(`Writing data to ${file.name}.json`);
		let json = JSON.stringify(file.data).beautifyJSON(file.split_rows_by);
		metadata.hashes[file.name] = crypto.createHash('sha256').update(json).digest('hex');
		fs.writeFileSync(`docs/data/${file.name}.json`, json);
	}

	fs.writeFileSync('docs/data/metadata.json', JSON.stringify(metadata));
}

fetch_all_data();