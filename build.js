const fs = require('fs');
const HTMLParser = require('node-html-parser');
const crypto = require('crypto');

const protocol = "https://";
const sofiatraffic_url = "sofiatraffic.bg";
const schedules_url = `${protocol}schedules.${sofiatraffic_url}/`;
const routes_url = `${protocol}routes.${sofiatraffic_url}/`;

const main_types = ['metro', 'tramway', 'trolleybus', 'autobus', 'fakemetro'];

const IS_IN_DEBUG_MODE = false;
const ROUTES_LIMIT = 3;
var current_routes = 0;

var metadata = {
	app_version: '2024-06-05',
	retrieval_date: new Date().toISOString().split('T')[0],
	hashes: {}
};

var stops = [];
var routes = [];
var trips = [];
var stop_times = [];
var directions = [];

var routes_urls = [];
var schedules_urls = [];

Array.prototype.find2DIndex = function(searching_for){
	var array = this.map(item => JSON.stringify(item));
	var searching_for = JSON.stringify(searching_for);
	return array.indexOf(searching_for);
};
function get_routes() {
	fetch(schedules_url)
	.then(response => response.text())
	.then(html => HTMLParser.parse(html))
	.then(document => {
		var data = Array.from(document.querySelector('#lines_quick_access').querySelectorAll('a')).map(el => el.getAttribute('href'));
		data.forEach(route => {
			var split_route = decodeURIComponent(route).split('/');
			var route_data = {
				line: Number(split_route[1]).toString()===split_route[1]?Number(split_route[1]):split_route[1],
			    type: split_route[0],
				trip_indexes: [],
				direction_codes: []
			};
			if(route_data.line=='M1-M2'){
				route_data.type = 'fakemetro';
			}
			if(Number.isInteger(route_data.line)){
				//ignore numbers, they are always regular lines
			}
            else if(route_data.line.indexOf('ТМ')!==-1 || route_data.line.indexOf('ТБ')!==-1){
                route_data.subtype = 'temporary';
            }
            else if(route_data.line.indexOf('N')!==-1){
                route_data.subtype = 'night';
            }
            else if(route_data.line.indexOf('У')!==-1){
                route_data.subtype = 'school';
            }
			if(route_data.type!=='tramway' && IS_IN_DEBUG_MODE){
				return;
			}
		    routes.push(route_data);
		});
		routes.push(
			{
				line: 'M1',
				type: 'metro',
				trip_indexes: [],
				direction_codes: [9994, 9995]
			},
			{
				line: 'M2',
				type: 'metro',
				trip_indexes: [],
				direction_codes: [9996, 9997]
			},
			{
				line: 'M4',
				type: 'metro',
				trip_indexes: [],
				direction_codes: [9998, 9999]
			}
		);
		directions.push({code: 9994, stops: [3001, 3003, 3005, 3007, 3009, 3011, 3013, 3015, 3017, 3019, 3021, 3023, 3025, 3039, 3041, 3043]});
		directions.push({code: 9995, stops: [3044, 3042, 3040, 3026, 3024, 3022, 3020, 3018, 3016, 3014, 3012, 3010, 3008, 3006, 3004, 3002]});
		directions.push({code: 9996, stops: [2975, 2977, 2979, 2981, 2983, 2985, 2987, 2989, 2991, 2993, 2995, 2997, 2999]});
		directions.push({code: 9997, stops: [3000, 2998, 2996, 2994, 2992, 2990, 2988, 2986, 2984, 2982, 2980, 2978, 2976]});
		directions.push({code: 9998, stops: [2999, 3001, 3003, 3005, 3007, 3009, 3011, 3013, 3015, 3017, 3019, 3021, 3023, 3025, 3027, 3029, 3031, 3033, 3035, 3037]});
		directions.push({code: 9999, stops: [3038, 3036, 3034, 3032, 3030, 3028, 3026, 3024, 3022, 3020, 3018, 3016, 3014, 3012, 3010, 3008, 3006, 3004, 3002, 3000]});
		routes.forEach((route, i)=>routes[i].ref = Number(route.line.toString().replaceAll(/[a-zA-Zа-яА-Я\-]+/g, '')));
		routes.sort((a, b) => {
			if(a.type === b.type){
				return a.ref>b.ref?1:-1;
			}
			return (main_types.indexOf(a.type) > main_types.indexOf(b.type))?1:-1;
		});
		routes[routes.length-1].type = 'metro';
		routes.forEach((route, route_index) => {
			delete routes[route_index].ref
			//ignore all M lines except for M1-M2 and M3
			if(current_routes==ROUTES_LIMIT && IS_IN_DEBUG_MODE || route.type=='metro' && ['M1', 'M2', 'M4'].indexOf(route.line)!=-1){
				return;
			}
			current_routes++;
			var url = `${schedules_url}${route.type}/${route.line}`;
			routes_urls.push([url, route_index]);
		});
		get_schedules(0);
	});
	fetch(`${routes_url}resources/stops-bg.json`)
	.then(response => response.json())
	.then(cgm_stops => {
		cgm_stops.forEach(stop => {
			stops.push({code: Number(stop.c), coords: [stop.y, stop.x], names: {bg: stop.n}});
		});
		return fetch(`${routes_url}resources/stops-en.json`)
	})
	.then(response => response.json())
	.then(cgm_stops => {
		cgm_stops.forEach(cgm_stop => {
			stops[stops.findIndex(stop => stop.code === Number(cgm_stop.c))].names.en = cgm_stop.n;
		});
		stops.sort((a, b) => a.code-b.code);
	});
}
function print_message(id, total, type, url){
	var id = (id+1).toString().padStart(total.toString().length, '0');
	console.log(`Processing ${type} ${id}/${total}: ${url}`);
}
function remove_new_line_chars(str){
    return str.replace(/[\n\r\t]/g, '');
}
function get_schedules(id){
	var data = routes_urls[id];
	var url = data[0];
	fetch(url)
	.then(response => response.text())
	.then(html => HTMLParser.parse(html))
	.then(document => document.querySelector('#line_view'))
	.then(line_view => {
		print_message(id, routes_urls.length, "route", url);
		const route_index = data[1];
		//делник, празник, предпразник
		var days_buttons = Array.from(line_view.querySelectorAll('.schedule_active_list_tab'));
		days_buttons.forEach(day_button => {
			var day = line_view.querySelector(`#${day_button.id.replace('button', 'content')}`);
			var valid_days = day_button.innerText.split(' / ').map(item => remove_new_line_chars(item));
			
			//посоки на движение за съответното разписание
			var all_directions_for_day_btns = Array.from(day.querySelectorAll('.schedule_view_direction_tab'));
			all_directions_for_day_btns.forEach(button => {
				//взимане на разписание по коли
                var valid_thru = [
					valid_days.indexOf('делник')!==-1?'1':'0',
					valid_days.indexOf('предпразник')!==-1?'1':'0',
					valid_days.indexOf('празник')!==-1?'1':'0'
				].join('');
				var valid_from = day.querySelector('em').innerText;
				var container = line_view.querySelector(`#${button.id.replace('button', 'container')}`);
				var stops_els = Array.from(container.previousElementSibling.querySelectorAll('.stop_link'));
				var cgm_params = button.id.split('_');
				var cgm_route_id = cgm_params[2];
				var cgm_dir_id = cgm_params[3];
				var direction = {code: Number(cgm_dir_id), stops: stops_els.map(element => parseInt(element.innerText))};
				var first_stop = direction.stops[0];
				var last_stop = direction.stops.toReversed()[0];
				var direction_index = directions.find2DIndex(direction);
				if(direction_index == -1){
					routes[route_index].direction_codes.push(direction.code);
					direction_index = directions.push(direction) - 1;
				}
				
                const trip = {route_index: route_index, direction: direction.code, valid_from: valid_from, valid_thru: valid_thru};
                var trip_index = trips.find2DIndex(trip);
				if(trip_index == -1){
					trip_index = trips.push(trip) - 1;
					routes[route_index].trip_indexes.push(trip_index);
				}
                //get from both ends, in order to catch all partial trips
				[first_stop, last_stop].forEach(stop => 
				schedules_urls.push({
                    url: `${schedules_url}server/html/schedule_load/${cgm_route_id}/${cgm_dir_id}/${stop}`,
                    trip: trip_index
                }));
			});
		});
	})
	.then(() => {
		if(routes_urls[id+1]){
			get_schedules(id+1);
		}
		else{
			get_times(0);
		}
	});
}
function get_times(id){
	var data = schedules_urls[id];
	print_message(id, schedules_urls.length, "schedule", data.url);
	fetch(data.url)
	.then(response => response.text())
	.then(response => HTMLParser.parse(response))
	.then(htmlDOM => Array.from(htmlDOM.querySelector('.schedule_times').querySelectorAll('a[onclick]')))
	.then(times => {
		times.forEach(time => {
			var car_schedule = time.getAttribute('onclick').split('\'')[5].split(',').map(a => a!==''?Number(a):a);
			var car_index = car_schedule.shift();
            //verify that the trip hasn't been added
            const car_trip = {trip: data.trip, car: car_index, times: car_schedule};
            const are_stop_times_present = stop_times.find2DIndex(car_trip)!==-1;
			if(!are_stop_times_present){
				stop_times.push(car_trip);
			}
		});
		if(schedules_urls[id+1]){
			//slows down requests
			setTimeout(() => get_times(id+1), 50);
		}
		else{
			//done
			finalise();
		}
	});
}
get_routes();

function finalise() {
    split_M1_M2(routes.pop());
	routes.map(route => delete route.index);
	console.log('Done!');
	directions.sort((a, b) => a.code-b.code)
	var files_to_write = [{
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
		split_rows_by: /,({"trip)/g
	}
	];

	String.prototype.beautifyJSON = function(find, replace=',\n$1'){
		return this
		.replace(/^\[/, '[\n')
		.replace(/\]$/, '\n]')
		.replace(find, replace)
	}
	
	files_to_write.forEach(file => {
		console.log(`Writing data to ${file.name}.json`);
		let json = JSON.stringify(file.data).beautifyJSON(file.split_rows_by);
		metadata.hashes[file.name] = crypto.createHash('sha256').update(json).digest('hex');
		fs.writeFileSync(`docs/data/${file.name}.json`, json);
	});

	fs.writeFileSync('docs/data/metadata.json', JSON.stringify(metadata));
}
function split_M1_M2(fict_route) {
	routes.map((route, index) => route.index = index);
	var actual_metro_routes = routes.filter(route => route.type=='metro' && route.line!='M3');
	var fake_dirs = directions.filter(dir => fict_route.direction_codes.indexOf(dir.code)!==-1);
	actual_metro_routes.forEach(act_route => {
		var real_dirs = directions.filter(dir => act_route.direction_codes.indexOf(dir.code)!==-1);
		//find matches
		real_dirs.forEach(real_dir => {
			fake_dirs.forEach(fake_dir => {
				let start_index = fake_dir.stops.indexOf(real_dir.stops[0]);
				let end_index = fake_dir.stops.indexOf(real_dir.stops.toReversed()[0]);
				if(start_index!==-1 && end_index!==-1){
					//found match
					//find matching trips and clone them
					var trips_for_cloning = trips.filter(trip => trip.direction==fake_dir.code);
					trips_for_cloning.map(trip => {
						var clone = JSON.parse(JSON.stringify(trip));
						clone.route_index = act_route.index;
						clone.direction = real_dir.code;
						var act_trip_index = trips.find2DIndex(clone);
						if(act_trip_index==-1){
							act_trip_index = trips.push(clone)-1;
							routes[act_route.index].trip_indexes.push(act_trip_index);
						}
						var fake_trip_index = trips.find2DIndex(trip);
						var stop_times_for_cloning = stop_times.filter(stop_time => stop_time.trip==fake_trip_index);
						stop_times_for_cloning.forEach(stop_time => {
							var cloned = {trip: act_trip_index, car: stop_time.car, times: stop_time.times.slice(start_index, end_index+1)};
							stop_times.push(cloned);
						});
					});
				}
			});
		});
	});
	trips = trips.filter(trip => {
		if(trip.route_index==fict_route.index){
			directions = directions.filter(dir => dir.code!==trip.direction);
			stop_times = stop_times.filter(stop_time => stop_time.trip!==trip.code);
			return false;
		}
		return true;
	});
}
