function mins_to_time(mins){
	if(!mins){
		return '-';
	}
	var hour = 0;
	while(mins>=60){
		hour++;
		mins -= 60;
	}
	return `${hour.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function init_schedules(){
	routes.map((route, index) => route.index = index);
	line_selector_div.appendChild(html_comp('h2', {text: 'Метро'}));
	create_schedule('metro', {class: 'text-success'});
	line_selector_div.appendChild(html_comp('h2', {text: 'Трамваи'}));
	create_schedule('tramway');
	line_selector_div.appendChild(html_comp('h2', {text: 'Тролейбуси'}));
	create_schedule('trolleybus');
	line_selector_div.appendChild(html_comp('h2', {text: 'Електробуси'}));
	create_schedule('electrobus');
	line_selector_div.appendChild(html_comp('h2', {text: 'Автобуси'}));
	create_schedule('autobus');
	line_selector_div.appendChild(html_comp('h2', {text: 'Нощни автобусни линии'}));
	create_schedule('night');
	line_selector_div.appendChild(html_comp('h2', {text: 'Заместващи автобусни линии'}));
	create_schedule('temp');
}
function create_schedule(type){
	var routes_to_process = [];
	if(['metro', 'tramway', 'trolleybus', 'electrobus', 'autobus'].indexOf(type)!==-1){
		routes_to_process = routes.filter((route) => route.type==type && !route.temp && !route.night);
	}
	else{
		routes_to_process = routes.filter((route) => route[type]);
	}
	routes_to_process.sort((a, b) => Number(a.line)>Number(b.line));
	routes_to_process.forEach(route => line_selector_div.append(html_comp('button', {text: decodeURI(route.line), 'data-route-index': route.index, class: `line_selector_btn text-light rounded-1 ${route.type!=='metro'?route.type:route.line}-bg-color`, 'onclick': 'show_schedule(this.dataset.routeIndex)'})));
}


function show_schedule(route_id){
    current_route_index = route_id;
	line_selector_div.classList.add('d-none');
    schedule_display_div.classList.remove('d-none');
	configure_weekday_selector();
}
function configure_weekday_selector(){
    var route = routes[current_route_index];
    var variants = route.schedules.map(schedule => schedule.valid_thru);
	//filter duplicates
	variants1 = variants
	.filter((c, index) => variants.indexOf(c) == index)
	.map(vari => {
		var res = [];
		if(vari[0]==='1'){
			res.push('делник');
		}
		if(vari[1]==='1'){
			res.push('предпразник');
		}
		if(vari[2]==='1'){
			res.push('празник');
		}
		return [vari, res.join(' / ')];
	});
	var types = {metro: 'Метролиния', tramway: 'Трамвай', trolleybus: 'Тролейбус', autobus: 'Автобус'};
	schedule_div.querySelector('#line').innerText = `${types[route.type]} ${decodeURI(route.line)}`;
	var old_date_type_select = schedule_div.querySelector('#date_type');
	var new_date_type_select = old_date_type_select.cloneNode(false);
	variants1.forEach((variant) => {
		new_date_type_select.appendChild(html_comp('option', {
			text: `${variant[1]}`,
			value: variant[0]
		}));
	});
	replace_child(new_date_type_select, old_date_type_select)
    configure_direction_selector();
}
function configure_direction_selector(){
    var route = routes[current_route_index];
	var metro = route.type=='metro';
    var start_end_stops = route.directions.map(direction => [direction[0], direction[direction.length-1]]);

	var old_directions_select = schedule_div.querySelector('#direction');
	var new_directions_select = old_directions_select.cloneNode(false);
	
	start_end_stops.forEach((pair, index) => {
		new_directions_select.appendChild(html_comp('option', {text: pair.map(stop =>  metro?get_stop_name(stop).replace('МЕТРОСТАНЦИЯ ', ''):get_stop_name(stop)).join(' -> '), value: index}));
	});
    replace_child(new_directions_select, old_directions_select);
    configure_stop_selector();
}
function configure_stop_selector(){
    var route = routes[current_route_index];
	var old_stop_el = schedule_div.querySelector('#stops');
    var new_stop_el = old_stop_el.cloneNode(false);
    var direction = schedule_div.querySelector('#direction').value;
	var metro = route.type=='metro';

	route.directions[direction].forEach(stop => new_stop_el.appendChild(html_comp('option', {text: `[${stop.toString().padStart(4, '0')}] ${metro?get_stop_name(stop).replace('МЕТРОСТАНЦИЯ ', ''):get_stop_name(stop)}`, value: stop})));
    replace_child(new_stop_el, old_stop_el);
	configure_favourite_stop_button();
    display_schedule();
}
function configure_favourite_stop_button(favourite_stops=false){
	var stop = schedule_div.querySelector('#stops').value;
	var star = schedule_div.querySelectorAll('i').item(1);
	console.log(favourite_stops);
	if(!favourite_stops){
		favourite_stops = JSON.parse(window.localStorage.getItem('favourite_stops'));
	}
	console.log(favourite_stops);
	if(favourite_stops.indexOf(stop.toString().padStart(4, '0'))==-1){
		star.classList.remove('bi-star-fill');
		star.classList.add('bi-star');
		star.dataset.style = "none";
	}
	else{
		star.classList.add('bi-star-fill');
		star.classList.remove('bi-star');
		star.dataset.style = "fill";
	}
}
function get_stop_name(id){
	if(!id){
		console.log(id);
		return '-';
	}
	return stops[id.toString().padStart(4, '0')].name_bg;
}
function display_schedule(){
	const table = schedule_div.querySelector('#schedule_table');
	const old_tbody = table.querySelector('tbody');
	var route = routes[current_route_index];

	var day_of_week_select = schedule_div.querySelector('#date_type');
	var day_select = day_of_week_select.options[day_of_week_select.selectedIndex];
	var valid_thru = day_select.value;

	var direction = parseInt(schedule_div.querySelector('#direction').value);
	var display_by_car = schedule_div.querySelector('#display_by_car').checked;
	var route_stops = route.directions[direction];
	var schedule = route.schedules.find(sch => sch.valid_thru===valid_thru && sch.direction===direction);
	schedule_div.querySelector('#valid_from').innerText = schedule.valid_from;

	var stop = parseInt(schedule_div.querySelector('#stops').value);
	var stop_index = route_stops.indexOf(stop);
	var last_stop_index = route_stops.length-1;

	var new_tbody = html_comp('tbody');
    var tr_thead = html_comp('tr');
    var tr_tbody = html_comp('tr');
	if(!display_by_car){
		//same as schedules.sofiatraffic.bg
		schedule.cars = schedule.cars.filter(a => a!==null);
        var cars = schedule.cars.map(times => times.map(time => [time[stop_index], time[0]=='', time[last_stop_index]==''])).flat().sort((a, b) => a[0]>b[0]);
		cars.forEach((time, index) => {
			cars[index][0] = mins_to_time(time[0]);
		});
		console.log(cars);
		var arranged = [];
        cars.forEach(car => {
            var hour = parseInt(car[0].split(':'));
            if(!arranged[hour]){
                arranged[hour] = [];
            }
            arranged[hour].push([car[0].split(':')[1], car[1], car[2]]);
        });
		// for(i=0;i<=24;i++){
		// 	if(!arranged[i]){
		// 		arranged[i] = [];
		// 	}
		// }
        arranged.forEach((time, index) => {
			tr_thead.appendChild(html_comp('th', {text: index}));
			var td1 = html_comp('td');
			time.forEach(time => {
				var el = html_comp('span', {
					text: time[0].toString(),
					'data-bs-toggle': 'modal',
					'data-bs-target': '#schedule_modal',
					'type': 'button',
					'data-time': (parseInt(index*60)+parseInt(time[0])),
					'onclick': 'display_vehicle_schedule(this.dataset.time)',
					'class': (time[1]?'bg-warning':(time[2]?'text-white bg-danger':''))
				});
				td1.appendChild(el);
				td1.appendChild(html_comp('span', {class: 'line-break'}));
			})
			tr_tbody.appendChild(td1);
		});
	}
	else{
		//show as cars
		schedule.cars.forEach((car, car_index) => {
			tr_thead.appendChild(html_comp('th', {text: car_index+1}));
			var td = html_comp('td');
			if(car!==null){
				car.forEach(times => {
					td.appendChild(html_comp('span', {text: mins_to_time(times[stop_index])}));
					td.appendChild(html_comp('span', {class: 'line-break'}));
				});
			}
			tr_tbody.appendChild(td);
			//tr_tbody.appendChild(html_comp('td', {text: car==null?'':car.map(times => mins_to_time(times[stop_index])).join('\n')}));
		});
	}
    new_tbody.appendChild(tr_thead);
    new_tbody.appendChild(tr_tbody);
	replace_child(new_tbody, old_tbody);
}
function display_vehicle_schedule(time){
	var time = parseInt(time);
	var route = routes[current_route_index];
	var direction = parseInt(schedule_div.querySelector('#direction').value);
	var stop = parseInt(schedule_div.querySelector('#stops').value);
	var stops = route.directions[direction];
	var stop_index = stops.indexOf(stop);
	var valid_thru = schedule_div.querySelector('#date_type').value;

	var cars = route.schedules.find(a => a.direction==direction && a.valid_thru==valid_thru).cars;
	cars.forEach((car, car_index) => {
		var correct_car = car
		.find(times => times.indexOf(time)==stop_index);
		console.log(correct_car);
		if(correct_car){
			var modal = document.querySelector('#schedule_modal');
			var old_tbody = modal.querySelector('tbody');
			var new_tbody = html_comp('tbody');
			correct_car.forEach((time, index) => {
				var tr = html_comp('tr');
				tr.appendChild(html_comp('td', {text: `[${stops[index]}] ${get_stop_name(stops[index])}`}));
				tr.appendChild(html_comp('td', {text: mins_to_time(time)}));
				new_tbody.append(tr);
			});
			replace_child(new_tbody, old_tbody);
			return;
		}
	});
}