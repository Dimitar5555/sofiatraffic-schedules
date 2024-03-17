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

function mins_to_time(mins, h24_to_0=false){
	if(!mins){
		return '-';
	}
	var hour = 0;
	while(mins>=60){
		hour++;
		mins -= 60;
	}
	if(h24_to_0 && hour>=24){
		hour -= 24;
	}
	return `${hour.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function init_schedules(){
	routes.map((route, index) => route.index = index);
	line_selector_div.appendChild(html_comp('div', {id: 'lines'}));
    create_schedule('metro');
    create_schedule('tramway');
    create_schedule('trolleybus');
    create_schedule('autobus');
	if(routes.filter(route => route.subtype=='temporary').length>0){
		create_schedule('temporary');
	}
	create_schedule('school');
    create_schedule('night');
}
function init_updated_schedules_table(){
	var dates = {};
	routes.forEach(route => {
		route.trips.forEach(trip => {
			var date = trip.valid_from.split('.').reverse().join('-');
			if(!dates[date]){
				dates[date] = [];
			}
			var schd = JSON.stringify([route.type, route.line, trip.valid_thru]);
			if(dates[date].indexOf(schd)==-1){
				dates[date].push(schd);
			}
		});
	});
	var tbody = document.querySelector('#updated_schedules_table').querySelector('tbody');
	var ordered_date_keys = Object.keys(dates).sort().reverse();
	var decode_weekdays = weekdays => weekdays.split('');
    var checkmark = html_comp('i', {class: 'bi bi-check'});
    console.log(dates);
    ordered_date_keys.forEach(key => {
		var tr0 = html_comp('tr');
        var td0 = html_comp('td', {text: key, class: "align-middle"});
        tr0.appendChild(td0);
        tbody.appendChild(tr0);
        
        var rows = 0;
        dates[key].map(line => JSON.parse(line))
        .map(line => {
            var tr = tr0;
            if(rows>0){
                tr = html_comp('tr');
                tbody.appendChild(tr);
            }
            tr.appendChild(html_comp('td', {text: `${lang.line_type[line[0]]} ${line[1]}`}));
            line[2].split('').map(val => {
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
}
function create_schedule(type){
	var routes_to_process = [];
	if(['metro', 'tramway', 'trolleybus', 'autobus'].indexOf(type)!==-1){
		routes_to_process = routes.filter((route) => route.type === type && !route.subtype);
	}
	else{
		routes_to_process = routes.filter((route) => route.subtype === type);
	}
	routes_to_process.sort((a, b) => Number(a.line)>Number(b.line));
    var prev = document.querySelector(`[data-i18n="line_types.${type}"]`);
	routes_to_process.forEach(route => {
        var temp = generate_line_btn(route.index);
        prev.parentNode.insertBefore(temp, prev.nextSibling);
        prev = temp;
    });
}

function show_schedule(el){
	document.querySelector('[role=tab]').click();
    update_globals(el.dataset.routeIndex);
	line_selector_div.classList.add('d-none');
    schedule_display_div.classList.remove('d-none');
	configure_weekday_selector();
    update_globals();
}
function configure_weekday_selector(){
    var route = routes[current_route_index];
    var variants = route.trips.map(schedule => schedule.valid_thru)
    .filter((c, index, list) => list.indexOf(c) == index)
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
	schedule_div.querySelector('#line').innerHTML = `<i class="lh-1 align-top h5 bi text-warning" onclick="add_remove_favourite_line()"></i> ${types[route.type]} ${decodeURI(route.line)}`;
	var old_date_type_select = schedule_div.querySelector('#date_type');
	var new_date_type_select = old_date_type_select.cloneNode(false);
	variants.forEach((variant, index) => {
		new_date_type_select.appendChild(html_comp('input', {
			value: variant[0],
            type: 'radio',
            id: `schedule_type_${index}`,
            name: 'schedule_type',
            onchange: 'configure_direction_selector(this.value)',
            class: 'form-check-input'
		}));
        new_date_type_select.appendChild(html_comp('label', {
            text: variant[1],
            'for': `schedule_type_${index}`
        }));
	});
	replace_child(new_date_type_select, old_date_type_select);
    document.querySelector("[name=schedule_type]").checked = true;
    configure_direction_selector();
}
function configure_direction_selector(){
    var route = routes[current_route_index];
	var is_metro = route.type=='metro';
    var start_end_stops = route.directions.map(direction => [direction[0], direction[direction.length-1]]);

	var old_directions_select = schedule_div.querySelector('#direction');
	var new_directions_select = old_directions_select.cloneNode(false);
	
	start_end_stops.forEach((pair, index) => {
		new_directions_select.appendChild(html_comp('option', {text: pair.map(stop =>  get_stop_name(stop, is_metro)).join(' -> '), value: index}));
	});
    replace_child(new_directions_select, old_directions_select);
    configure_stop_selector();
}
function configure_stop_selector(){
    var route = routes[current_route_index];
	var old_stop_el = schedule_div.querySelector('#stops');
    var new_stop_el = old_stop_el.cloneNode(false);
    var direction = schedule_div.querySelector('#direction').value;
	var is_metro = route.type=='metro';
	
	if(direction==''){
		//route has no stops
	}
	else{
		route.directions[direction]
        .forEach((stop, stop_index) => new_stop_el.appendChild(html_comp('option', {
            text: `[${stop.toString().padStart(4, '0')}] ${get_stop_name(stop, is_metro)}`,
            value: stop_index
        })));
	}
	replace_child(new_stop_el, old_stop_el);
    update_globals();
	configure_favourite_stop_button();
	configure_favourite_line_button();
    display_schedule();
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
	if(!favourite_stops){
		favourite_stops = get_favourite_stops();
	}
	if(current_stop_code==undefined){
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
		star.setAttribute('onmouseover', "toggle_star(this, 'over')");
		star.setAttribute('onmouseout', "toggle_star(this, 'out')");
		star.setAttribute('onclick', "add_remove_favourite_stop()");		
		star.classList.add('text-warning');
		star.classList.remove('text-secondary');
	}
    console.log(current_stop_code, favourite_stops.indexOf(current_stop_code)!==-1)
	if(favourite_stops.indexOf(current_stop_code)==-1){
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
function get_stop_name(id, hide_metro_part=false){
	if(!id || id==undefined){
		return '-';
	}
    var stop = stops.find(stop => stop.code === Number(id));
    if(hide_metro_part){
        return stop.names[lang.code].replace('МЕТРОСТАНЦИЯ', '').replace('METRO STATION', '').replace('METROSTANTSIA', '').replaceAll('  ', ' ').trim() || "(НЕИЗВЕСТНА СПИРКА)";
    }
    return stop.names[lang.code] || "(НЕИЗВЕСТНА СПИРКА)";
}
function display_schedule(schedule_index){
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

	var valid_thru = Array.from(document.querySelectorAll('[name=schedule_type]')).find(el => el.checked).value;

	var direction = parseInt(schedule_div.querySelector('#direction').value);
	var display_by_car = schedule_div.querySelector('#display_by_car').checked;
	var route_stops = route.directions[direction];
	var trip_index = route.trips.findIndex(trip => trip.valid_thru === valid_thru && trip.direction === direction);
    var route_schedules = route.stop_times.filter(stop_times => stop_times.trip === trip_index);
	schedule_div.querySelector('#valid_from').innerText = route.trips[trip_index].valid_from;

	var stop_index = parseInt(schedule_div.querySelector('#stops').value);

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
            console.log(time, hour);
            arranged[hour].push({
                mins: time,
                incomplete_course_start: route_schedules[rs_index].times[0]=='',
                incomplete_course_final: route_schedules[rs_index].times.toReversed()[0]==''
            });
        });
        for(i=0;i<=23;i++){
			arranged[i] = arranged[i].sort((a, b) => a.mins>b.mins);
		}
        console.log(arranged);
        
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
	replace_child(new_tbody, old_tbody);
}
function display_vehicle_schedule(time){
	var time = parseInt(time);

	var route = routes[current_route_index];
	var direction = parseInt(schedule_div.querySelector('#direction').value);
	var stop_index = parseInt(schedule_div.querySelector('#stops').value);
	var route_stops = route.directions[direction];
	var valid_thru = Array.from(document.querySelectorAll('[name=schedule_type]')).find(el => el.checked).value;
    var is_metro = route.type=='metro';    
    
	var trip_index = route.trips.findIndex(a => a.direction==direction && a.valid_thru==valid_thru);
    var schedules = route.stop_times.filter(stop_times => stop_times.trip === trip_index);
    var times = schedules.find(schedule => schedule.times[stop_index]===time).times;
    console.log(schedules, times);
	var modal = document.querySelector('#schedule_modal');
	var old_tbody = modal.querySelector('tbody');
	var new_tbody = html_comp('tbody');
	times.forEach((time, cur_stop_index) => {
		var tr = html_comp('tr');
		var highlight = cur_stop_index==document.querySelector('#stops').value?'bg-warning':'';
        const stop = stops.find(stop => stop.code===route_stops[cur_stop_index]) || false;
        if(!stop){
            alert(`index:${cur_stop_index}, stop:${route_stops[cur_stop_index]}`);        
        }
		tr.appendChild(html_comp('td', {text: stop.code.toString().padStart(4, '0'), class: `align-middle ${highlight}`}));
		tr.appendChild(html_comp('td', {text: get_stop_name(stop.code, is_metro), class: `${highlight}`}));
		tr.appendChild(html_comp('td', {text: mins_to_time(time, true), class: `align-middle ${highlight}`}));
		new_tbody.append(tr);
	});
	replace_child(new_tbody, old_tbody);
}
function update_globals(new_route_index=false){
    if(new_route_index){
        current_route_index = new_route_index;
    }
    current_route_direction = parseInt(schedule_div.querySelector('#direction').value);
    if(schedule_div.querySelector('#stops').value!==''){
        current_stop_code = parseInt(routes[current_route_index].directions[current_route_direction][schedule_div.querySelector('#stops').value]);
    }
}
