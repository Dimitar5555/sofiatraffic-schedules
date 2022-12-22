const fetch = require('node-fetch');
const fs = require('fs');
const HTMLParser = require('node-html-parser');

const protocol = "https://";
const sofiatraffic_url = "sofiatraffic.bg/";
const schedules_url = `${protocol}schedules.${sofiatraffic_url}`;
const routes_url = `${protocol}routes.${sofiatraffic_url}`;

var routes = [];
var promises = [];
Array.prototype.find2DIndex = function(searching_for){
	var array = this.map(item => JSON.stringify(item));
	var searching_for = JSON.stringify(searching_for);
	return array.indexOf(searching_for);
};
function get_routes() {
	fetch(`${schedules_url}/`)
	.then(response => response.text())
	.then(html => HTMLParser.parse(html))
	.then(document => {
		var data = Array.from(document.querySelector('#lines_quick_access').querySelectorAll('a')).map(el => el.getAttribute('href'));
		data.forEach(route => {
			var split_route = route.split('/');
			var route_data = {
				line: split_route[1],
				temp: decodeURI(split_route[1]).indexOf('ТМ')!==-1,
				night: split_route[1].indexOf('N')!==-1,
				type: split_route[0],
				directions: [],
				schedules: []
			};
			routes.push(route_data);
		});
		routes.map(route => {
			var url = `${schedules_url}${route.type}/${route.line}`;
			console.log(`Fetching ${url}`)
			promises.push(
			fetch(url)
			.then(response => response.text())
			.then(html => HTMLParser.parse(html))
			.then(document => document.querySelector('#line_view'))
			.then(line_view => {
				console.log(`Processing ${url}`);
				const route_index = routes.findIndex(cur_route => cur_route.line==route.line && cur_route.type==route.type);
				//делник, празник, предпразник
				var days_buttons = Array.from(line_view.querySelectorAll('.schedule_active_list_tab'));
				days_buttons.forEach(day_button => {
					var day = line_view.querySelector(`#${day_button.id.replace('button', 'content')}`);
					var valid_days = day_button.innerText.split(' / ').map(item => item.replaceAll('\n', '').replaceAll('\t', '').replaceAll(' ', ''));
					
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
							cars: [],
							valid_from: day.querySelector('em').innerText
						};
						var container = line_view.querySelector(`#${button.id.replace('button', 'container')}`);
						var stops = Array.from(container.previousElementSibling.querySelectorAll('.stop_link')).map(element => parseInt(element.innerText));
						local_sched.direction = routes[route_index].directions.find2DIndex(stops);
						if(local_sched.direction == -1){
							local_sched.direction = routes[route_index].directions.push(stops) - 1;
						}
						
						var times = Array.from(container.querySelector('.schedule_times').querySelectorAll('a[onclick]'));
						times.forEach(time => {
							var car_schedule = time.getAttribute('onclick').split('\'')[5].split(',').map(a => a!==''?Number(a):a);
							var car = car_schedule.shift();
							var car_index = car-1;
							if(!local_sched.cars[car_index]){
								local_sched.cars[car_index] = [];
							}
							local_sched.cars[car_index].push(car_schedule);
						});
						routes[route_index].schedules.push(local_sched);
					});
				});
			})
			);
		});
		//console.log(routes);
	});
	fetch(`${routes_url}resources/stops-bg.json`)
	.then(response => response.json())
	.then(stops => {
		var res = {};
		stops.forEach(stop => {
			res[stop.c] = {name_bg: stop.n, coords: [stop.x, stop.y]};
		});
		fetch(`${routes_url}resources/stops-en.json`)
		.then(response => response.json())
		.then(stops => {
			stops.forEach(stop => {
				res[stop.c].name_en = stop.n;
			});
			res[3336] = {
				name_bg: "МЕТРОСТАНЦИЯ ГОРНА БАНЯ"
			};
			res[3335] = {
				name_bg: "МЕТРОСТАНЦИЯ ГОРНА БАНЯ"
			};
			res[3334] = {
				name_bg: "МЕТРОСТАНЦИЯ ОВЧА КУПЕЛ II"
			};
			res[3333] = {
				name_bg: "МЕТРОСТАНЦИЯ ОВЧА КУПЕЛ II"
			};
			res[3332] = {
				name_bg: "МЕТРОСТАНЦИЯ МИЗИЯ / НБУ"
			};
			res[3331] = {
				name_bg: "МЕТРОСТАНЦИЯ МИЗИЯ / НБУ"
			};
			res[3330] = {
				name_bg: "МЕТРОСТАНЦИЯ ОВЧА КУПЕЛ"
			};
			res[3329] = {
				name_bg: "МЕТРОСТАНЦИЯ ОВЧА КУПЕЛ"
			};
			res[3328] = {
				name_bg: "МЕТРОСТАНЦИЯ ЦАР БОРИС III / КРАСНО СЕЛО"
			};
			res[3327] = {
				name_bg: "МЕТРОСТАНЦИЯ ЦАР БОРИС III / КРАСНО СЕЛО"
			};
			res[3326] = {
				name_bg: "МЕТРОСТАНЦИЯ УЛ. ДОЙРАН"
			};
			res[3325] = {
				name_bg: "МЕТРОСТАНЦИЯ УЛ. ДОЙРАН"
			};
			res[3324] = {
				name_bg: "МЕТРОСТАНЦИЯ БУЛ. БЪЛГАРИЯ"
			};
			res[3323] = {
				name_bg: "МЕТРОСТАНЦИЯ БУЛ. БЪЛГАРИЯ"
			};
			res[3322] = {
				name_bg: "МЕТРОСТАНЦИЯ МЕДИЦИНСКИ УНИВЕРСИТЕТ"
			};
			res[3321] = {
				name_bg: "МЕТРОСТАНЦИЯ МЕДИЦИНСКИ УНИВЕРСИТЕТ"
			};
			res[3320] = {
				name_bg: "МЕТРОСТАНЦИЯ НДК 2"
			};
			res[3319] = {
				name_bg: "МЕТРОСТАНЦИЯ НДК 2"
			};
			res[3318] = {
				name_bg: "МЕТРОСТАНЦИЯ СВ. ПАТРИАРХ ЕВТИМИЙ"
			};
			res[3317] = {
				name_bg: "МЕТРОСТАНЦИЯ СВ. ПАТРИАРХ ЕВТИМИЙ"
			};
			res[3316] = {
				name_bg: "МЕТРОСТАНЦИЯ ОРЛОВ МОСТ"
			};
			res[3315] = {
				name_bg: "МЕТРОСТАНЦИЯ ОРЛОВ МОСТ"
			};
			res[3312] = {
				name_bg: "МЕТРОСТАНЦИЯ ТЕАТРАЛНА"
			};
			res[3311] = {
				name_bg: "МЕТРОСТАНЦИЯ ТЕАТРАЛНА"
			};
			res[3310] = {
				name_bg: "МЕТРОСТАНЦИЯ ХАДЖИ ДИМИТЪР"
			};
			res[3309] = {
				name_bg: "МЕТРОСТАНЦИЯ ХАДЖИ ДИМИТЪР"
			};
			fs.writeFileSync('data/stops.json', JSON.stringify(res));
		});
	})
}
function get_route_schedule(){

}
get_routes();
setTimeout(() => {
	Promise.all(promises)
	.then(() => {
		var M1_M2_index = routes.findIndex(route1 => route1 && route1.line=='M1-M2');
		console.log(M1_M2_index);
		var res = split_M1_M2(routes[M1_M2_index]);
		delete routes[M1_M2_index];
		
		var M3_index = routes.findIndex(route1 => route1 && route1.line=='M3');
		res.forEach(route => {
			//put routes in correct order
			if(route.line=='M1'){
				routes.splice(M3_index, 0, route);
			}
			else if(route.line=='M2'){
				routes.splice(M3_index+1, 0, route);
			}
			else{
				routes.push(route);
			}
		});
		routes = routes.filter(route => !!route);
		routes.sort((a, b) => a.line<b.line);

		console.log('Done! Writing data to schedule.json');
		fs.writeFileSync('data/schedule.json', JSON.stringify(routes));
	})
}, 1500);
function split_M1_M2(route) {
	var actual_routes = [
		{
			line: 'M1',
			directions: [
				[3001, 3003, 3005, 3007, 3009, 3011, 3013, 3015, 3017, 3019, 3021, 3023, 3025, 3039, 3041, 3043],
				[3044, 3042, 3040, 3026, 3024, 3022, 3020, 3018, 3016, 3014, 3012, 3010, 3008, 3006, 3004, 3002]
			],
			temp: false,
			night: false,
			type: 'metro',
			schedules: []
		},
		{
			line: 'M2',
			directions: [
				[2999, 3001, 3003, 3005, 3007, 3009, 3011, 3013, 3015, 3017, 3019, 3021, 3023, 3025, 3027, 3029, 3031, 3033, 3035, 3037],
				[3038, 3036, 3034, 3032, 3030, 3028, 3026, 3024, 3022, 3020, 3018, 3016, 3014, 3012, 3010, 3008, 3006, 3004, 3002, 3000]
			],
			temp: false,
			night: false,
			type: 'metro',
			schedules: []
		},
		{
			line: 'M4',
			directions: [
				[2975, 2977, 2979, 2981, 2983, 2985, 2987, 2989, 2991, 2993, 2995, 2997, 2999],
				[3000, 2998, 2996, 2994, 2992, 2990, 2988, 2986, 2984, 2982, 2980, 2978, 2976]
			],
			temp: false,
			night: false,
			type: 'metro',
			schedules: []
		}
	];
	
	var directions = route.directions;
	var cgm_dirs = [];
	directions.forEach((direction, direction_index) => {
		actual_routes.forEach((actual_route, route_index) => {
			for(i=0;i<=1;i++){
				var start_stop_index = direction.indexOf(actual_route.directions[i][0]);
				var end_stop_index = direction.indexOf(actual_route.directions[i][actual_route.directions[i].length-1]);
				if(start_stop_index!==-1 && end_stop_index!==-1){
					var applies_to = route.schedules.filter(a => a.direction==direction_index);
					applies_to.forEach(cars => {
						var valid_thru_index = actual_routes[route_index].schedules.findIndex(a => a.valid_thru==cars.valid_thru && a.direction==i);
						if(valid_thru_index==-1){
							valid_thru_index = actual_routes[route_index].schedules.push({direction: i, valid_thru: cars.valid_thru, valid_from: cars.valid_from, cars: []})-1;
						}
						cars.cars.forEach((car, car_index) => {
							if(car==null){
								return;
							}
							if(!actual_routes[route_index].schedules[valid_thru_index].cars[car_index]){
								actual_routes[route_index].schedules[valid_thru_index].cars[car_index] = [];
							}
							car.forEach(time => {
								if(time==null){
									console.log('test');
								}
								actual_routes[route_index].schedules[valid_thru_index].cars[car_index].push(time);
							})
						})
					});
					cgm_dirs.push([actual_route.line, direction_index, start_stop_index, end_stop_index, i]);
				}
			}
		});
	});
	return actual_routes;
}