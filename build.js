const fetch = require('node-fetch');
const fs = require('fs');
const HTMLParser = require('node-html-parser');
const crypto = require('crypto');

const protocol = "https://";
const sofiatraffic_url = "sofiatraffic.bg";
const schedules_url = `${protocol}schedules.${sofiatraffic_url}/`;
const routes_url = `${protocol}routes.${sofiatraffic_url}/`;

const ROUTES_LIMIT = 0;
var current_routes = 0;

var date = new Date();
var metadata = {
	app_version: '2023-05-04',
	routes_hash: '',
	stops_hash: '',
	retrieval_date: `${date.getUTCFullYear()}-${(date.getUTCMonth()+1).toString().padStart(2, '0')}-${date.getUTCDate().toString().padStart(2, '0')}`
};
var routes = [];

var routes_urls = [];
var schedules_urls = [];

Array.prototype.find2DIndex = function(searching_for){
	var array = this.map(item => JSON.stringify(item));
	var searching_for = JSON.stringify(searching_for);
	return array.indexOf(searching_for);
};
function get_routes() {
	fetch(`${schedules_url}`)
	.then(response => response.text())
	.then(html => HTMLParser.parse(html))
	.then(document => {
		var data = Array.from(document.querySelector('#lines_quick_access').querySelectorAll('a')).map(el => el.getAttribute('href'));
		data.forEach(route => {
			var split_route = route.split('/');
			var route_data = {
				line: split_route[1],
			    type: split_route[0],
			    directions: [],
				trips: [],
                stop_times: []
			};
            if(decodeURI(split_route[1]).indexOf('ТМ')!==-1){
                route_data.subtype = 'temp';
            }
            else if(decodeURI(split_route[1]).indexOf('N')!==-1){
                route_data.subtype = 'night';
            }
            else if(decodeURI(split_route[1]).indexOf('У')!==-1){
                route_data.subtype = 'school';
            }
			routes.push(route_data);
		});
		routes.map((route, route_index) => {
			current_routes++;
			if(ROUTES_LIMIT!=0 && current_routes>ROUTES_LIMIT){
				return;
			}
			var url = `${schedules_url}${route.type}/${route.line}`;
			routes_urls.push([url, route_index]);
		});
		get_schedules(0);
	});
	fetch(`${routes_url}resources/stops-bg.json`)
	.then(response => response.json())
	.then(stops => {
		var res = [];
		stops.forEach(stop => {
			res.push({code: Number(stop.c), coords: [stop.y, stop.x], names: {bg: stop.n}});
		});
		fetch(`${routes_url}resources/stops-en.json`)
		.then(response => response.json())
		.then(stops => {
			stops.forEach(cgm_stop => {
				res[res.findIndex(stop => stop.code === Number(cgm_stop.c))].names.en = cgm_stop.n;
			});
			res.push(
                { code: 3336, names: { bg: "МЕТРОСТАНЦИЯ ГОРНА БАНЯ", en: "GORNA BANYA METRO STATION" } },
                { code: 3335, names: { bg: "МЕТРОСТАНЦИЯ ГОРНА БАНЯ", en: "GORNA BANYA METRO STATION" } },
                { code: 3334, names: { bg: "МЕТРОСТАНЦИЯ ОВЧА КУПЕЛ II", en: "OVCHA KUPEL II METRO STATION" } },
                { code: 3333, names: { bg: "МЕТРОСТАНЦИЯ ОВЧА КУПЕЛ II", en: "OVCHA KUPEL II METRO STATION" } },
                { code: 3332, names: { bg: "МЕТРОСТАНЦИЯ МОЕСИЯ / НБУ", en: "MOESIA / NBU METRO STATION" } },
                { code: 3331, names: { bg: "МЕТРОСТАНЦИЯ МОЕСИЯ / НБУ", en: "MOESIA / NBU METRO STATION" } },
                { code: 3330, names: { bg: "МЕТРОСТАНЦИЯ ОВЧА КУПЕЛ", en: "OVCHA KUPEL METRO STATION" } },
                { code: 3329, names: { bg: "МЕТРОСТАНЦИЯ ОВЧА КУПЕЛ", en: "OVCHA KUPEL METRO STATION" } },
                { code: 3328, names: { bg: "МЕТРОСТАНЦИЯ ЦАР БОРИС III / КРАСНО СЕЛО", en: "TSAR BORIS III / KRASNO SELO METRO STATION" } },
                { code: 3327, names: { bg: "МЕТРОСТАНЦИЯ ЦАР БОРИС III / КРАСНО СЕЛО", en: "TSAR BORIS III / KRASNO SELO METRO STATION" } },
                { code: 3326, names: { bg: "МЕТРОСТАНЦИЯ УЛ. ДОЙРАН", en: "UL. DOYRAN METRO STATION" } },
                { code: 3325, names: { bg: "МЕТРОСТАНЦИЯ УЛ. ДОЙРАН", en: "UL. DOYRAN METRO STATION" } },
                { code: 3324, names: { bg: "МЕТРОСТАНЦИЯ БУЛ. БЪЛГАРИЯ", en: "BUL. BULGARIA METRO STATION" } },
                { code: 3323, names: { bg: "МЕТРОСТАНЦИЯ БУЛ. БЪЛГАРИЯ", en: "BUL. BULGARIA METRO STATION" } },
                { code: 3322, names: { bg: "МЕТРОСТАНЦИЯ МЕДИЦИНСКИ УНИВЕРСИТЕТ", en: "MEDICAL UNIVERSITY METRO STATION" } },
                { code: 3321, names: { bg: "МЕТРОСТАНЦИЯ МЕДИЦИНСКИ УНИВЕРСИТЕТ", en: "MEDICAL UNIVERSITY METRO STATION" } },
                { code: 3320, names: { bg: "МЕТРОСТАНЦИЯ НДК 2", en: "NDK 2 METRO STATION" } },
                { code: 3319, names: { bg: "МЕТРОСТАНЦИЯ НДК 2", en: "NDK 2 METRO STATION" } },
                { code: 3318, names: { bg: "МЕТРОСТАНЦИЯ СВ. ПАТРИАРХ ЕВТИМИЙ", en: "ST. PATRIARCH EVTIMIY METRO STATION" } },
                { code: 3317, names: { bg: "МЕТРОСТАНЦИЯ СВ. ПАТРИАРХ ЕВТИМИЙ", en: "ST. PATRIARCH EVTIMIY METRO STATION" } },
                { code: 3316, names: { bg: "МЕТРОСТАНЦИЯ ОРЛОВ МОСТ", en: "ORLOV MOST METRO STATION" } },
                { code: 3315, names: { bg: "МЕТРОСТАНЦИЯ ОРЛОВ МОСТ", en: "ORLOV MOST METRO STATION" } },
                { code: 3312, names: { bg: "МЕТРОСТАНЦИЯ ТЕАТРАЛНА", en: "TEATRALNA METRO STATION" } },
                { code: 3311, names: { bg: "МЕТРОСТАНЦИЯ ТЕАТРАЛНА", en: "TEATRALNA METRO STATION" } },
                { code: 3310, names: { bg: "МЕТРОСТАНЦИЯ ХАДЖИ ДИМИТЪР", en: "HADZHI DIMITAR METRO STATION" } },
                { code: 3309, names: { bg: "МЕТРОСТАНЦИЯ ХАДЖИ ДИМИТЪР", en: "HADZHI DIMITAR METRO STATION" } }
			);

			var stops_json = JSON.stringify(res).replace(/,{"code/g, ',\n{"code');//.map(stop => JSON.stringify(stop)).join('\n');
			metadata.stops_hash = crypto.createHash('sha256').update(stops_json).digest('hex');
			fs.writeFileSync('docs/data/stops.json', stops_json);
		});
	})
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
				var local_sched = {
					valid_thru: [
						valid_days.indexOf('делник')!==-1?'1':'0',
						valid_days.indexOf('предпразник')!==-1?'1':'0',
						valid_days.indexOf('празник')!==-1?'1':'0'
					].join(''),
					times: [],
					valid_from: day.querySelector('em').innerText,
                    direction: null,
                    trip: null
				};
				var container = line_view.querySelector(`#${button.id.replace('button', 'container')}`);
				var stops_els = Array.from(container.previousElementSibling.querySelectorAll('.stop_link'));
				var stops = stops_els.map(element => parseInt(element.innerText));
				var first_stop = stops[0];
				var last_stop = stops[stops.length-1];
				local_sched.direction = routes[route_index].directions.find2DIndex(stops);
				if(local_sched.direction == -1){
					local_sched.direction = routes[route_index].directions.push(stops) - 1;
				}
                const trip = {valid_from: local_sched.valid_from, valid_thru: local_sched.valid_thru, direction: local_sched.direction};
                local_sched.trip = routes[route_index].trips.find2DIndex(trip);
				if(local_sched.trip == -1){
					local_sched.trip = routes[route_index].trips.push(trip) - 1;
				}
                //get from both ends, in order to catch all partial trips
				schedules_urls.push({
                    url: `${schedules_url}server/html/schedule_load/${button.id.split('_')[2]}/${button.id.split('_')[3]}/${first_stop}`,
                    route_index: route_index,
                    direction_index: local_sched.direction,
                    trip: local_sched.trip
                });
				schedules_urls.push({
                    url: `${schedules_url}server/html/schedule_load/${button.id.split('_')[2]}/${button.id.split('_')[3]}/${last_stop}`,
                    route_index: route_index,
                    direction_index: local_sched.direction,
                    trip: local_sched.trip
                });
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
		var route_index = data[1];
		var schedule_index = data[2];
        //var schedule_index = routes[route_index].stop_times.findIndex(schedule => schedule.direction == direction_index/* && schedule.valid_thru == "s"*/);
		times.forEach(time => {
			var car_schedule = time.getAttribute('onclick').split('\'')[5].split(',').map(a => a!==''?Number(a):a);
			var car_index = car_schedule.shift();
            //verify that the trip hasn't been added
            const result = {car: car_index, times: car_schedule, trip: data.trip};
            const are_stop_times_present = routes[data.route_index].stop_times.find2DIndex(result)!==-1;
			if(!are_stop_times_present){
				routes[data.route_index].stop_times.push(result);
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
	var M1_M2_index = routes.findIndex(route1 => route1 && route1.line=='M1-M2');
    routes[M1_M2_index].line = 'M1-2';
    routes[M1_M2_index].type = 'metro';
	/*var res = split_M1_M2(routes[M1_M2_index]);
	delete routes[M1_M2_index];
	
	res.forEach(route => {
    	routes.push(route);
	});*/
	routes = routes.filter(route => !!route);
	routes.sort((a, b) => a.line<b.line);

	console.log('Done! Writing data to schedule.json');
	var routes_json = JSON.stringify(routes).replace(/,{"car/g, ',\n{"car').replace(/,{"line/g, ',\n{"line');
	fs.writeFileSync('docs/data/schedule.json', routes_json);
	metadata.routes_hash = crypto.createHash('sha256').update(routes_json).digest('hex');
	fs.writeFileSync('docs/data/metadata.json', JSON.stringify(metadata));
}
function split_M1_M2(fict_route) {
	var actual_routes = [{
		line: 'M1',
		directions: [
			[3001, 3003, 3005, 3007, 3009, 3011, 3013, 3015, 3017, 3019, 3021, 3023, 3025, 3039, 3041, 3043],
			[3044, 3042, 3040, 3026, 3024, 3022, 3020, 3018, 3016, 3014, 3012, 3010, 3008, 3006, 3004, 3002]
		],
		type: 'metro',
		trips: [],
        stop_times: []
	},
	{
		line: 'M2',
		directions: [
			[2975, 2977, 2979, 2981, 2983, 2985, 2987, 2989, 2991, 2993, 2995, 2997, 2999],
			[3000, 2998, 2996, 2994, 2992, 2990, 2988, 2986, 2984, 2982, 2980, 2978, 2976]
		],
		type: 'metro',
		trips: [],
        stop_times: []
	},
	{
		line: 'M4',
		directions: [
			[2999, 3001, 3003, 3005, 3007, 3009, 3011, 3013, 3015, 3017, 3019, 3021, 3023, 3025, 3027, 3029, 3031, 3033, 3035, 3037],
			[3038, 3036, 3034, 3032, 3030, 3028, 3026, 3024, 3022, 3020, 3018, 3016, 3014, 3012, 3010, 3008, 3006, 3004, 3002, 3000]
		],
		type: 'metro',
		trips: [],
        stop_times: []
	}];
	
    function determine_dir_and_indexes(part_ends, combined_route){
        var start_index = combined_route.indexOf(part_ends[0]);
        var end_index = combined_route.indexOf(part_ends[1]);
        if(start_index === -1 || end_index === -1){
            return false;
        }
        return [start_index, end_index];
    }

	var directions = fict_route.directions;
	var cgm_dirs = [];
    //for each real route
    actual_routes.forEach((act_route, act_index) => {
        //and each of it's directions
        act_route.directions.forEach((act_dir, act_dir_index) => {
            const ends = [act_dir[0], act_dir[act_dir.length-1]];
            //try to find matches from fict_route
            fict_route.directions.forEach((fict_route_dir, fict_route_dir_index) => {
                var length_for_splice = act_dir.length;
                var start = false, end=false;
                if(fict_route_dir.indexOf(act_dir[0])!==-1){
                    start = fict_route_dir.indexOf(act_dir[0]);
                    end = start + length_for_splice;
                }

                if(start || end){
                    fict_route.trips.forEach((trip, fict_trip_index) => {
                        if(trip.direction !== fict_route_dir_index){
                            return;
                        }
                        //check for duplicates
                        const new_trip = {valid_from: trip.valid_from, valid_thru: trip.valid_thru, direction: act_dir_index};
                        var act_trip_index = actual_routes[act_index].trips.find2DIndex(new_trip);
                        if(act_trip_index==-1){
                            act_trip_index = actual_routes[act_index].trips.push(new_trip);
                        }
                        var stop_times1 = fict_route.stop_times.filter(st => st["trip"] === fict_trip_index);
                        stop_times1.forEach(st => {
                            var copy = JSON.parse(JSON.stringify(st));                
                            copy.trip = act_trip_index;
                            copy.times.splice(start, end);
                            if(copy.times.filter(time => time!=='').length>0){
                                actual_routes[act_index].stop_times.push(copy);                                                
                            }
                            //stop_times1[index].times.splice(indexes_for_splicing[0], indexes_for_splicing[1]);
                            //stop_times1[index].trip = act_trip_index;
                        });
                    });
                }

            });
        });
    });
    /*directions.forEach((direction, direction_index) => {
		actual_routes.forEach((actual_route, route_index) => {
			for(i=0;i<=1;i++){
				var start_stop_index = direction.indexOf(actual_route.directions[i][0]);
				var end_stop_index = direction.indexOf(actual_route.directions[i][actual_route.directions[i].length-1]);
				if(start_stop_index!==-1 && end_stop_index!==-1){
					var applies_to = route.trips.filter(a => a.direction==direction_index);
					applies_to.forEach(cars => {
						var valid_thru_index = actual_routes[route_index].stop_times.findIndex(a => a.valid_thru==cars.valid_thru && a.direction==i);
						if(valid_thru_index==-1){
							valid_thru_index = actual_routes[route_index].stop_times.push({direction: i, valid_thru: cars.valid_thru, valid_from: cars.valid_from, cars: []})-1;
						}
						cars.cars.forEach((car, car_index) => {
							if(car==null){
								return;
							}
							if(!actual_routes[route_index].stop_times[valid_thru_index].cars[car_index]){
								actual_routes[route_index].stop_times[valid_thru_index].cars[car_index] = [];
							}
							car.forEach(time => {
								actual_routes[route_index].stop_times[valid_thru_index].cars[car_index].push(time);
							})
						})
					});
					cgm_dirs.push([actual_route.line, direction_index, start_stop_index, end_stop_index, i]);
				}
			}
		});
	});*/
	return actual_routes;
}
