import fs from "fs";
import crypto from "crypto"
import { get_stops_data } from "./build_stops.js";
import { get_routes_data, fetch_schedule_data, process_schedule_data } from "./build_routes.js";

var metadata = {
	app_version: '2024-08-17',
	retrieval_date: new Date().toISOString().split('T')[0],
	hashes: {}
};

const timeout = 1000; // ms

const routes_limit = 0; // used for debugging

Array.prototype.find2DIndex = function(searching_for){
	var array = this.map(item => JSON.stringify(item));
	var searching_for = JSON.stringify(searching_for);
	return array.indexOf(searching_for);
};

function sleep(time) {
	return new Promise((resolve) => {
		setTimeout(resolve, time);
	});
}

async function fetch_all_data() {
	console.log('Starting build script');
	console.log('Fetching tokens');
	console.log('Fetching stops data');
	let stops = get_stops_data();


	
	console.log('Fetching routes data');
	let routes = get_routes_data();


	Promise.all([stops, routes])
	.then(async([stops, routes]) => {
		//let stops = data[0];
		//let routes = data[1];
		let directions = [];
		let stop_times = [];
		let trips = [];
		
		let route_index = 0;
		for(const route of routes) {
			if(route_index >= routes_limit && routes_limit != 0) {
				break;
			}
			await fetch_schedule_data(route.cgm_id)
			.then(data => {
				console.log(`Fetching route data: ${route_index+1}/${routes.length}`);
				return data;
			})
			.then(data => process_schedule_data(data, route_index, directions, stop_times, trips, route.type == 'metro'))
			route_index++;
			await sleep(timeout);
		}

		// remove temporary data
		routes.forEach(route => {
			delete route.temp_ref;
			// delete route.temp_cgm_id;
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

		// patch SUMC fake partial courses which represent driver changes
		const do_stop_times_match = (st1, st2) => {
			return st1.trip == st2.trip && JSON.stringify(st2.times) == JSON.stringify(st1.times);
		}

		let partial_courses_from_depot = stop_times.filter(st => st.times[0] == null);
		let partial_courses_to_depot = stop_times.filter(st => st.times.toReversed()[0] == null);
		
		for(let st_to_depot of partial_courses_to_depot) {
			let st_from_depot = partial_courses_from_depot.find(st_from_depot => {
				if(st_from_depot.trip != st_to_depot.trip) {
					return false;
				}
				let first_time_index = st_from_depot.times.findIndex(time => time != null);
				let first_time = st_from_depot.times[first_time_index];
				let last_time_index = st_to_depot.times.findLastIndex(time => time != null);
				let last_time = st_to_depot.times[last_time_index];
				return last_time == first_time && first_time_index == last_time_index;
			});
			if(st_from_depot) {
				let st_from_depot_index = stop_times.findIndex(st => do_stop_times_match(st, st_to_depot));
				let st_to_depot_index = stop_times.findIndex(st => do_stop_times_match(st, st_from_depot));
				let destination = stop_times[st_to_depot_index].times;
				let source = stop_times[st_from_depot_index].times;

				source.forEach((time, time_index) => {
					if(time != null) {
						destination[time_index] = time;
					}
				});
				stop_times.splice(st_from_depot_index, 1);
			}
		}

		// sort directions by code
		directions.sort((a, b) => a.code - b.code);
		
		var files_to_save = [
			{
				name: 'routes',
				data: routes,
				split_rows_by: /,({"route_ref)/g
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