function mins_to_time(mins, h24_to_0=false){
	if(!mins){
		return '-';
	}
	var hour = 0;
	while(mins>=60){
		hour++;
		mins -= 60;
	}
	if(h24_to_0 && hour==24){
		hour = 0;
	}
	return `${hour.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function init_schedules(){
	schedule_display_div.querySelector('button').childNodes[1].textContent = lang.schedules.back;
	var labels = schedule_display_div.querySelectorAll('label');
	labels.item(0).innerText = lang.schedules.line;
	labels.item(1).innerText = lang.schedules.schedule;
	labels.item(2).innerText = lang.schedules.valid_from;
	labels.item(3).innerText = lang.schedules.direction;
	labels.item(4).innerText = lang.schedules.stop;
	labels.item(5).innerText = lang.schedules.show_by_cars;
	
	var modal = document.querySelector('#schedule_modal');
	modal.querySelectorAll('button').item(1).innerText = lang.schedules.close;
	modal.querySelector('.modal-title').innerText = lang.schedules.modal_title;
	var ths = modal.querySelectorAll('th');
	ths.item(0).innerText = lang.schedules.stop;
	ths.item(1).innerText = lang.schedules.departure_time;

	routes.map((route, index) => route.index = index);
	line_selector_div.appendChild(html_comp('h2', {text: lang.line_types.metros}));
	create_schedule('metro', {class: 'text-success'});
	line_selector_div.appendChild(html_comp('h2', {text: lang.line_types.tramways}));
	create_schedule('tramway');
	line_selector_div.appendChild(html_comp('h2', {text: lang.line_types.trolleybuses}));
	create_schedule('trolleybus');
	line_selector_div.appendChild(html_comp('h2', {text: lang.line_types.electrobuses}));
	create_schedule('electrobus');
	line_selector_div.appendChild(html_comp('h2', {text: lang.line_types.autobuses}));
	create_schedule('autobus');
	line_selector_div.appendChild(html_comp('h2', {text: lang.line_types.temporary}));
	create_schedule('temp');
	line_selector_div.appendChild(html_comp('h2', {text: lang.line_types.night}));
	create_schedule('night');
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
			res.push(lang.weekdays.weekday);
		}
		if(vari[1]==='1'){
			res.push(lang.weekdays.pre_holiday);
		}
		if(vari[2]==='1'){
			res.push(lang.weekdays.holiday);
		}
		return [vari, res.join(' / ')];
	});
	var types = lang.line_type;
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
	
	if(direction==''){
		//route has no stops
	}
	else{
		route.directions[direction].forEach(stop => new_stop_el.appendChild(html_comp('option', {text: `[${stop.toString().padStart(4, '0')}] ${metro?get_stop_name(stop).replace('МЕТРОСТАНЦИЯ ', ''):get_stop_name(stop)}`, value: stop})));
	}
	replace_child(new_stop_el, old_stop_el);
	configure_favourite_stop_button();
    display_schedule();
}
function configure_favourite_stop_button(favourite_stops=false){
	var stop = schedule_div.querySelector('#stops').value;
	var star = schedule_div.querySelectorAll('i').item(1);
	if(!favourite_stops){
		favourite_stops = JSON.parse(window.localStorage.getItem('favourite_stops'));
	}
	if(stop==''){
		star.classList.remove('bi-star-fill');
		star.classList.add('bi-star');
		star.dataset.style = "disabled";
		star.removeAttribute('onmouseover');
		star.removeAttribute('onmouseout');
		star.removeAttribute('onclick');
		star.classList.remove('text-warning');
		star.classList.add('text-secondary');
		return;
	}
	else{
		star.setAttribute('onmouseover', "if(this.dataset.style=='none'){this.classList.remove('bi-star');this.classList.add('bi-star-fill');}else{this.classList.add('bi-star');this.classList.remove('bi-star-fill');}");
		star.setAttribute('onmouseout', "if(this.dataset.style=='none'){this.classList.add('bi-star');this.classList.remove('bi-star-fill');}else{this.classList.remove('bi-star');this.classList.add('bi-star-fill');}");
		star.setAttribute('onclick', "add_remove_favourite_stop(this.parentElement.nextElementSibling.querySelector('select').value.toString().padStart(4, '0'))");		
		star.classList.add('text-warning');
		star.classList.remove('text-secondary');
	}
	if(favourite_stops.indexOf(stop.toString().padStart(4, '0'))==-1){
		star.classList.remove('bi-star-fill');
		star.classList.add('bi-star');
		star.dataset.style = "none";
		star.setAttribute('title', lang.schedules.add_to_favourites);
	}
	else{
		star.classList.add('bi-star-fill');
		star.classList.remove('bi-star');
		star.dataset.style = "fill";
		star.setAttribute('title', lang.schedules.remove_from_favourites);
	}
}
function get_stop_name(id){
	if(!id){
		return '-';
	}
	return stops[id.toString().padStart(4, '0')][`name_${lang.code}`];
}
function display_schedule(){
	const table = schedule_div.querySelector('#schedule_table');
	const old_tbody = table.querySelector('tbody');
	var route = routes[current_route_index];

	var new_tbody = html_comp('tbody');
    var tr_thead = html_comp('tr');
    var tr_tbody = html_comp('tr');

	if(route.directions.length==0){
		//no schedule
		tr_thead.appendChild(html_comp('th', {text: 'Липсва разписание за избраната линия.'}));
		new_tbody.appendChild(tr_thead);
		new_tbody.appendChild(tr_tbody);
		replace_child(new_tbody, old_tbody);
		return;
	}

	var day_of_week_select = schedule_div.querySelector('#date_type');
	var day_select = day_of_week_select.options[day_of_week_select.selectedIndex];
	var valid_thru = day_select?.value;

	var direction = parseInt(schedule_div.querySelector('#direction').value);
	var display_by_car = schedule_div.querySelector('#display_by_car').checked;
	var route_stops = route.directions[direction];
	var schedule = route.schedules.find(sch => sch.valid_thru===valid_thru && sch.direction===direction);
	schedule_div.querySelector('#valid_from').innerText = schedule?.valid_from;

	var stop = parseInt(schedule_div.querySelector('#stops').value);
	var stop_index = route_stops.indexOf(stop);
	var last_stop_index = route_stops.length-1;

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
			search_for_24 = false;
			if(hour==24){
				hour = 0;
				search_for_24 = true;
			}
            if(!arranged[hour]){
                arranged[hour] = [];
            }
            arranged[hour].push([car[0].split(':')[1], car[1], car[2], search_for_24]);
        });
		if(!arranged[0]){
			arranged[0] = [];
		}
		if(arranged[24]){
			arranged[0] = arranged[0].concat(arranged[24]);
		}
		delete arranged[24];
		//adds empty hours
		for(i=0;i<=23;i++){
			if(!arranged[i]){
				arranged[i] = [];
			}
		}
        arranged.forEach((time, index) => {
			tr_thead.appendChild(html_comp('th', {text: index==24?0:index}));
			var td1 = html_comp('td');
			time.forEach(time => {
				var el = html_comp('span', {
					text: time[0].toString(),
					'data-bs-toggle': 'modal',
					'data-bs-target': '#schedule_modal',
					type: 'button',
					'data-time': (parseInt(index*60)+parseInt(time[0])),
					onclick: 'display_vehicle_schedule(this.dataset.time, this.dataset[\'is-24h\'])',
					class: (time[1]?'bg-warning':(time[2]?'text-white bg-danger':'')),
					'data-is-24h': time[3]
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
				car.forEach((times, index) => {
					td.appendChild(html_comp('span', {
						text: mins_to_time(times[stop_index]),
						'data-bs-toggle': 'modal',
						'data-bs-target': '#schedule_modal',
						type: 'button',
						'data-time': parseInt(times[stop_index]),
						onclick: 'display_vehicle_schedule(this.dataset.time, this.dataset[\'is-24h\'])',}));
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
function display_vehicle_schedule(time, is24h){
	is24h = is24h=='true';
	var time = (is24h?24*60:0)+parseInt(time);
	console.log(time);
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
		if(correct_car){
			var modal = document.querySelector('#schedule_modal');
			var old_tbody = modal.querySelector('tbody');
			var new_tbody = html_comp('tbody');
			correct_car.forEach((time, index) => {
				var tr = html_comp('tr');
				tr.appendChild(html_comp('td', {text: `[${stops[index].toString().padStart(4, '0')}] ${get_stop_name(stops[index])}`}));
				tr.appendChild(html_comp('td', {text: mins_to_time(time, true)}));
				new_tbody.append(tr);
			});
			replace_child(new_tbody, old_tbody);
			return;
		}
	});
}