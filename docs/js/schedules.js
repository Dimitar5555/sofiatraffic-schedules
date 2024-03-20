function toggle_star(star, event){
	if(star.dataset.style=='disabled'){
		return;
	}
	const fill = 'bi-star-fill';
	const empty = 'bi-star';
	if(event=='out'){
		star.classList.replace(...star.dataset.style=='none'?[fill, empty]:[empty, fill]);
	}
	else{
		star.classList.replace(...star.dataset.style=='none'?[empty, fill]:[fill, empty]);
	}
}

function mins_to_time(time){
	if(!time){
		return '-';
	}
	var hour = Math.floor(time/60);
	hour = hour>=24?hour-24:hour;
	hour = hour.toString().padStart(2, '0');
	var mins = (time%60).toString().padStart(2, '0');
	return `${hour}:${mins}`;
}

function init_schedules(){
	routes.map((route, index) => route.index = index);
	line_selector_div.appendChild(html_comp('div', {id: 'lines'}));
	//generate selector butons for line selection
	main_types.forEach(type => create_schedule(type));
	sec_types.forEach(subtype => {
		if(routes.filter(route => route.subtype===subtype).length>0){
			create_schedule(subtype);
		}
		else{
			document.querySelector(`#line_selector_${subtype}`).classList.add('d-none');
		}
	});
}
function init_updated_schedules_table(){
	//handles the table with last updated schedules
	var dates = {};
	trips.forEach(trip => {
		var date = trip.valid_from.split('.').reverse().join('-');
		if(!dates[date]){
			dates[date] = [];
		}
		var route = routes[trip.route_index];
		console.log(trip);
		if(route){
			var schd = JSON.stringify([route.type, route.line, trip.valid_thru]);
			if(dates[date].indexOf(schd)==-1){
				dates[date].push(schd);
			}
		}
	});
	var old_tbody = document.querySelector('#updated_schedules_table').querySelector('tbody');
	var new_tbody = old_tbody.cloneNode();
	var sorted_dates = Object.keys(dates).toSorted().reverse();
    var checkmark = html_comp('i', {class: 'bi bi-check'});
	
    sorted_dates.forEach(key => {
		var tr0 = html_comp('tr');
        var td0 = html_comp('td', {text: key, class: "align-middle"});
        tr0.appendChild(td0);
        new_tbody.appendChild(tr0);
        
        var rows = 0;
        dates[key].map(line => JSON.parse(line))
        .map(route => {
            var tr = tr0;
            if(rows>0){
                tr = html_comp('tr');
                new_tbody.appendChild(tr);
            }
            tr.appendChild(html_comp('td'));
			tr.lastElementChild.appendChild(html_comp('span',  {text: route[1], class: `${route[0]!=='metro'?route[0]:route[1]}-bg-color text-light px-1`}));
            route[2].split('').map(val => {
		      var td = html_comp('td', {});
                if(val==1){
                    td.appendChild(checkmark.cloneNode());
                }
                tr.appendChild(td);
            });
            rows++;
        });
        td0.setAttribute('rowspan', rows);
	});
	old_tbody.replaceWith(new_tbody);
}
function create_schedule(type){
	let routes_to_process = [];
	if(main_types.indexOf(type)!==-1){
		routes_to_process = routes.filter((route) => route.type === type && !route.subtype);
	}
	else{
		routes_to_process = routes.filter((route) => route.subtype === type);
	}
	let oldContainer = document.querySelector(`#line_selector_${type}`).querySelector('.lines');
	let newContainer = oldContainer.cloneNode();
	routes_to_process.forEach(route => {
        let line_btn = generate_line_btn(route.index);
        newContainer.appendChild(line_btn);
    });
	oldContainer.replaceWith(newContainer);
}

function update_stop_labels(){
	var stop_labels = Array.from(document.querySelectorAll('[data-i18n="schedules.stop"]'));
	var path = stop_labels[0].dataset.i18n.split('.');
	if(current.route && current.route.type=='metro'){
		path = stop_labels[0].dataset.i18nAlt.split('.');
	}
	let string = path.reduce((acc, cur) => acc[cur], lang);
	stop_labels[0].innerText = string;
	stop_labels[1].innerText = string;
}
function show_schedule(new_globals, lock_globals=false){
	if(!lock_globals){
		update_globals(new_globals);
	}
	if(new_globals.route){
		update_stop_labels();
	}
	document.querySelector('[role=tab]').click();
	line_selector_div.classList.add('d-none');
    schedule_display_div.classList.remove('d-none');

	configure_all_selectors(new_globals);
	configure_favourite_stop_button();
	configure_favourite_line_button();
	updateURL();
}

function configure_all_selectors(predefined_values={}, reset=false){
	var route = current.route;
	schedule_div.querySelector('#line').innerHTML = `${lang.line_type[route.type]} ${route.line}`;
	
	var current_weekday_options = Array.from(document.querySelectorAll('[name=schedule_type]')).map(el => el.value);
	var new_weekday_options = route.trips.map(trip_index => trips[trip_index].valid_thru).filter((item, index, arr) => arr.indexOf(item)==index);
	var weekday_selectors_ok = new_weekday_options.filter(loc_valid_thru => current_weekday_options.indexOf(loc_valid_thru)==-1).length==0;
	if(!weekday_selectors_ok || reset){
		let index = new_weekday_options.indexOf(predefined_values.valid_thru);
		let selected_index = index!==-1?index:0;
		configure_weekday_selector(new_weekday_options, selected_index);
	}
	var valid_thru_val = Array.from(document.querySelectorAll('[name=schedule_type]')).find(el => el.checked).value;
	
	var current_direction_options = Array.from(schedule_div.querySelector('#direction').querySelectorAll('option')).map(el => Number(el.value));
	var new_direction_options = route.directions;
	var direction_options_ok = new_direction_options.filter(direction => current_direction_options.indexOf(direction)==-1).length==0;
	if(!direction_options_ok || reset){
		let index = new_direction_options.indexOf(predefined_values.direction?.code);
		let selected_index = index!==-1?index:0;
		configure_direction_selector(new_direction_options, selected_index);
	}
	var direction = parseInt(schedule_div.querySelector('#direction').value);
	
	var current_stop_options = Array.from(schedule_div.querySelector('#stops').querySelectorAll('option')).map(el => Number(el.value));
	var new_stop_options = directions.find(dir => dir.code==direction).stops;
	var stop_options_ok = JSON.stringify(current_stop_options)==JSON.stringify(new_stop_options);
	if(!stop_options_ok || reset){
		let index = new_stop_options.indexOf(predefined_values.stop);
		let selected_index = index!==-1?index:0;
		configure_stop_selector(new_stop_options, selected_index);
	}
	display_schedule();
}

function configure_weekday_selector(values, selected_index){
    var variants = values
	.map(days => {
		var res = [];
		if(days[0]==='1'){
			res.push(lang.weekdays.weekday);
		}
		if(days[1]==='1'){
			res.push(lang.weekdays.pre_holiday);
		}
		if(days[2]==='1'){
			res.push(lang.weekdays.holiday);
		}
		return [days, res.join(' / ')];
	});
	var old_date_type_select = schedule_div.querySelector('#date_type');
	var new_date_type_select = old_date_type_select.cloneNode();
	variants.forEach((variant, index) => {
		new_date_type_select.appendChild(html_comp('input', {
			value: variant[0],
            type: 'radio',
            id: `schedule_type_${index}`,
            name: 'schedule_type',
            onchange: 'show_schedule({valid_thru: this.value})',
            class: 'form-check-input'
		}));
        new_date_type_select.appendChild(html_comp('label', {
            text: variant[1],
            'for': `schedule_type_${index}`
        }));
		new_date_type_select.appendChild(document.createTextNode(' '));
	});
	old_date_type_select.replaceWith(new_date_type_select);
    document.querySelectorAll("[name=schedule_type]").item(selected_index).checked = true;
}
function configure_direction_selector(values, selected_index){
	var old_directions_select = schedule_div.querySelector('#direction');

    var start_end_stops = values.map(dir_code => {
		var index = directions.findIndex(dir => dir.code==dir_code);
		return ({
			index: directions[index].code,
			stops: [directions[index].stops[0], directions[index].stops.toReversed()[0]]
		});
	});
	
	var new_directions_select = old_directions_select.cloneNode(false);
	start_end_stops.forEach(pair => {
		new_directions_select.appendChild(html_comp('option', {
			text: pair.stops.map(stop =>  get_stop_name(stop)).join(' -> '),
			value: pair.index
		}));
	});

    old_directions_select.replaceWith(new_directions_select);
	new_directions_select.selectedIndex = selected_index;
}
function configure_stop_selector(values, selected_index){
	var old_stop_el = schedule_div.querySelector('#stops');
    var new_stop_el = old_stop_el.cloneNode();

	values
	.forEach(stop => new_stop_el.appendChild(
		html_comp('option', {
			text: `[${stop.toString().padStart(4, '0')}] ${get_stop_name(stop)}`,
			value: stop
		})
	));

	old_stop_el.replaceWith(new_stop_el);
	new_stop_el.selectedIndex = selected_index;
}
function configure_favourite_line_button(favourite_lines=false){
	var star = schedule_div.querySelectorAll('i').item(1);
	star.setAttribute('onmouseover', "toggle_star(this, 'over')");
	star.setAttribute('onmouseout', "toggle_star(this, 'out')");
	if(!favourite_lines){
		favourite_lines = get_favourite_lines();
	}
	var id = gen_route_json();
	if(favourite_lines.indexOf(id)!==-1){
		star.classList.add('bi-star-fill');
		star.classList.remove('bi-star');
		star.dataset.style = "fill";
		star.setAttribute('title', lang.schedules.remove_from_favourites);
	}
	else{
		star.classList.remove('bi-star-fill');
		star.classList.add('bi-star');
		star.dataset.style = "none";
		star.setAttribute('title', lang.schedules.add_to_favourites);
	}
}
function configure_favourite_stop_button(favourite_stops=false){
	var star = schedule_div.querySelectorAll('i').item(2);
	star.setAttribute('onmouseover', "toggle_star(this, 'over')");
	star.setAttribute('onmouseout', "toggle_star(this, 'out')");
	if(!favourite_stops){
		favourite_stops = get_favourite_stops();
	}
	/*if(current.stop_code==null){
		star.classList.remove('bi-star-fill');
		star.classList.add('bi-star');
		star.dataset.style = "disabled";
		star.classList.remove('text-warning');
		star.classList.add('text-secondary');
		return;
	}
	else{
		star.classList.add('text-warning');
		star.classList.remove('text-secondary');
	}*/
	
	if(favourite_stops.indexOf(current.stop_code)==-1){
        //not in list, unfill star
		star.classList.remove('bi-star-fill');
		star.classList.add('bi-star');
		star.dataset.style = "none";
		star.setAttribute('title', lang.schedules.add_to_favourites);
	}
	else{
        //in list, fill star
		star.classList.add('bi-star-fill');
		star.classList.remove('bi-star');
		star.dataset.style = "fill";
		star.setAttribute('title', lang.schedules.remove_from_favourites);
	}
}
function get_stop_name(id/*, hide_metro_part=false*/){
	var hide_metro_part = current.route && current.route.type=='metro';
	if(!id || id==undefined){
		return '-';
	}
    var stop = stops.find(stop => stop.code === Number(id));
    if(hide_metro_part){
        return stop.names[lang.code].replace('МЕТРОСТАНЦИЯ', '').replace('METRO STATION', '').replace('METROSTANTSIA', '').replaceAll('  ', ' ').trim() || "(НЕИЗВЕСТНА СПИРКА)";
    }
    return stop?.names[lang.code] || "(НЕИЗВЕСТНА СПИРКА)";
}
function display_schedule(){
	const table = schedule_div.querySelector('#schedule_table');
	const old_tbody = table.querySelector('tbody');
	var route = current.route;
	var new_tbody = html_comp('tbody');
    var tr_thead = html_comp('tr');
    var tr_tbody = html_comp('tr');

	if(trips.filter(trip => trip.route_index==route.index).length==0){
		//no schedule
		tr_thead.appendChild(html_comp('th', {text: 'Липсва разписание за избраната линия.'}));
		new_tbody.appendChild(tr_thead);
		new_tbody.appendChild(tr_tbody);
		old_tbody.replaceWith(new_tbody);
		return;
	}

	var valid_thru = Array.from(document.querySelectorAll('[name=schedule_type]')).find(el => el.checked).value;

	var direction = parseInt(schedule_div.querySelector('#direction').value);
	var display_by_car = schedule_div.querySelector('#display_by_car').checked;
	//var route_stops = route.directions[direction];
	var trip_index = trips.findIndex(trip => trip.route_index==current.route.index && trip.valid_thru === valid_thru && trip.direction === direction);
    var route_schedules = stop_times.filter(stop_times => stop_times.trip === trip_index);
	schedule_div.querySelector('#valid_from').innerText = trips[trip_index].valid_from;

	var stop_index = schedule_div.querySelector('#stops').selectedIndex;

	if(!display_by_car){
        var times = route_schedules.map(sch => sch.times[stop_index]);//.filter(time => time != '');
        var arranged = [];
		//adds all hours
		for(i=0;i<=23;i++){
			arranged[i] = [];
		}
        times.map((time, rs_index) => {
            if(time=='' || !time){
                return;            
            }
            var hour = Math.floor(time/60);
            var after_midnight = hour>=24;
            if(hour>=24){
                hour -= 24;
            }
            arranged[hour].push({
                mins: time,
                incomplete_course_start: route_schedules[rs_index].times[0]=='',
                incomplete_course_final: route_schedules[rs_index].times.toReversed()[0]==''
            });
        });
        for(i=0;i<=23;i++){
			arranged[i] = arranged[i].sort((a, b) => a.mins>b.mins);
		}
        
        arranged.forEach((time, index) => {
			tr_thead.appendChild(html_comp('th', {text: index==24?0:index.toString().padStart(2, '0')}));
			var td1 = html_comp('td');
			time.forEach(time => {
                var el_class = '';
                if(time.incomplete_course_start){
                    el_class = 'bg-warning';
                }
                else if(time.incomplete_course_final){
                    el_class = 'text-white bg-danger';
                }
				var el = html_comp('span', {
					text: (time.mins%60).toString().padStart(2, '0'),
					'data-bs-toggle': 'modal',
					'data-bs-target': '#schedule_modal',
					type: 'button',
					'data-time': time.mins,
					onclick: 'display_vehicle_schedule(this.dataset.time)',
					class: el_class
				});
				td1.appendChild(el);
				td1.appendChild(html_comp('span', {class: 'line-break'}));
			});
			tr_tbody.appendChild(td1);
		});
	}
	else{
		//show by cars
        var cars = [];
        route_schedules.map(schedule => {
            if(!cars[schedule.car-1]){
                cars[schedule.car-1] = [];
            }
            cars[schedule.car-1].push({
                mins: schedule.times[stop_index],
                incomplete_course_start: schedule.times[0]=='',
                incomplete_course_final: schedule.times.toReversed()[0]==''
            });
        });
        cars.map((car, car_index) => {
            //car.sort((a, b) => a.mins>b.mins);
            tr_thead.appendChild(html_comp('th', {text: car_index+1}));
			var td = html_comp('td');
            car.sort((a, b)=>a.mins>b.mins).forEach((times, index) => {
                if(times.mins === ''){
                    return;
                }
                var el_class = '';
                if(times.incomplete_course_start){
                    el_class = 'bg-warning';
                }
                else if(times.incomplete_course_final){
                    el_class = 'text-white bg-danger';
                }
			    td.appendChild(html_comp('span', {
				    text: mins_to_time(times.mins),
				    'data-bs-toggle': 'modal',
				    'data-bs-target': '#schedule_modal',
				    type: 'button',
				    'data-time': times.mins,
                    'class': el_class,
				    onclick: 'display_vehicle_schedule(this.dataset.time)',}));
			    td.appendChild(html_comp('span', {class: 'line-break'}));
		    });
		    tr_tbody.appendChild(td);

        });
	}
    new_tbody.appendChild(tr_thead);
    new_tbody.appendChild(tr_tbody);
	old_tbody.replaceWith(new_tbody);
}
function display_vehicle_schedule(time){
	var time = parseInt(time);

	var route = current.route;
	var direction = current.trip.direction;
	var stop_index = schedule_div.querySelector('#stops').selectedIndex;
	var route_stops = directions.find(dir => dir.code==direction).stops;
	var valid_thru = Array.from(document.querySelectorAll('[name=schedule_type]')).find(el => el.checked).value;
    var is_metro = route.type=='metro';    
    
	var trip_index = trips.findIndex(a => a.route_index==route.index && a.direction==direction && a.valid_thru==valid_thru);
    var schedules = stop_times.filter(stop_times => stop_times.trip === trip_index);
    var times = schedules.find(schedule => schedule.times[stop_index]===time).times;
	
	var modal = document.querySelector('#schedule_modal');
	var old_tbody = modal.querySelector('tbody');
	var new_tbody = html_comp('tbody');
	times.forEach((time, cur_stop_index) => {
		var tr = html_comp('tr');
		var highlight = cur_stop_index==document.querySelector('#stops').selectedIndex?'bg-warning':'';
        const stop = stops.find(stop => stop.code===route_stops[cur_stop_index]) || false;
        if(!stop){
            alert(`index:${cur_stop_index}, stop:${route_stops[cur_stop_index]}`);        
        }
		tr.appendChild(html_comp('td', {text: stop.code.toString().padStart(4, '0'), class: `align-middle ${highlight}`}));
		tr.appendChild(html_comp('td', {text: get_stop_name(stop.code, is_metro), class: `${highlight}`}));
		tr.appendChild(html_comp('td', {text: mins_to_time(time), class: `align-middle ${highlight}`}));
		new_tbody.append(tr);
	});
	old_tbody.replaceWith(new_tbody);
}
function update_globals(new_route_index=false, reset=false){
	if(reset){
		current.route = null;
		current.trip = null;
		current.stop_code = null;
		return;
	}

	if(new_route_index.route){
		current.route = new_route_index.route;
	}
	if(new_route_index.trip){
		current.trip = new_route_index.trip;
	}
	else{
		current.trip = trips.find(trip => trip.route_index==current.route.index && trip.direction==document.querySelector('#direction').value && trip.valid_thru==Array.from(document.querySelectorAll('[name=schedule_type]')).filter(el => el.checked).map(el => el.value)[0]);
	}
	if(!current.trip){
		current.trip = trips[current.route.trips[0]];
	}
	if(new_route_index.direction){
		current.direction = new_route_index.direction;
	}
	else{
		current.direction = directions.find(dir => dir.code==current.trip.direction);
	}
	/*if(!current.direction){
		current.direction = directions.find(dir => dir.code==current.route.directions[0]);
	}*/
	if(new_route_index.stop_code){
		current.stop_code = parseInt(new_route_index.stop_code);
	}
	else{
		current.stop_code = parseInt(schedule_div.querySelector('#stops').value);
	}
	if(!current.stop_code){
		current.stop_code = current.direction.stops[0];
	}
}
