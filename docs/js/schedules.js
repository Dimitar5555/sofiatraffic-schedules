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

function format_time(time, only_one_number=false){
	if(!time && typeof time!='number'){
		return '-';
	}
	if(only_one_number){
		return time.toString().padStart(2, '0');
	}
	var hour = Math.floor(time/60);
	if(hour>=24){
		hour -= 24;
	}
	return `${format_time(hour, true)}:${format_time(time%60, true)}`;
}

function init_schedules_data(loc_data){
	//add trips and directions to routes, based on trips
	loc_data.routes.forEach((route, index) => {
		route.index = index;
		route.trip_indexes = [];
		route.direction_codes = [];
	});

	//add indexes to stop_times
	loc_data.stop_times.forEach((stop_time, index) => stop_time.index = index);

	//add trip indexes and direction codes to routes
	loc_data.trips.forEach((trip, trip_index) => {
		let route = loc_data.routes[trip.route_index];
		if(!route.trip_indexes.includes(trip_index)){
			route.trip_indexes.push(trip_index);
		}
		if(!route.direction_codes.includes(trip.direction)){
			route.direction_codes.push(trip.direction);
		}
	});

	//add directions and routes to stops
	loc_data.stops.forEach(stop => {
		stop.direction_codes = [];
		stop.route_indexes = [];
	});
	loc_data.directions.forEach(direction => {
		let route_index = loc_data.routes.findIndex(route => route.direction_codes.includes(direction.code));
		direction.stops.forEach(stop_code => {
			var stop_index = loc_data.stops.findIndex(stop => stop.code==stop_code);
			if(stop_index!=-1) {
				let stop = loc_data.stops[stop_index];
				if(!stop.direction_codes.includes(direction.code)){
					stop.direction_codes.push(direction.code);
				}
				if(!stop.route_indexes.includes(route_index)) {
					stop.route_indexes.push(route_index);
				}
			}
		});
	});

	loc_data.stops.forEach(stop => {
		stop.route_indexes.sort((a, b) => a-b);
	});

	data = loc_data;
}

function generate_routes_thumbs(routes, parent) {
	routes.forEach(route => {
		parent.appendChild(html_comp('span', {class: get_route_colour_classes(route), text: route.route_ref}))
		parent.appendChild(document.createTextNode(' '));
	});
}

function generate_stop_row(stop) {
	let tr = html_comp('tr', {'data-stop-code': stop.code});
	tr.appendChild(html_comp('td', {text: format_stop_code(stop.code), class: 'align-middle'}));
	tr.appendChild(html_comp('td', {text: get_stop_name(stop), class: 'align-middle'}));

	let lines_td = html_comp('td', {class: 'align-middle'});
	let routes = stop.route_indexes.map(index => data.routes[index]);
	generate_routes_thumbs(routes, lines_td);
	tr.appendChild(lines_td);

	let td3 = html_comp('td', {class: 'align-middle'});
	let btn_group_1 = generate_stop_action_buttons(stop.code, {pan_btn: true, icons_only: true});
	let btn_group_2 = btn_group_1.cloneNode(true);
	btn_group_1.setAttribute('class', 'btn-group d-none d-md-block');
	btn_group_2.setAttribute('class', 'btn-group-vertical d-block d-md-none');
	td3.appendChild(btn_group_1);
	td3.appendChild(btn_group_2);
	tr.appendChild(td3);
	return tr;
}

function get_routes_by_type(type){
	if(main_types[type]){
		return data.routes.filter(route => route.type === type && !route.subtype);
	}
	return data.routes.filter(route => route.subtype === type);
}
function init_schedules(){
	line_selector_div.appendChild(html_comp('div', {id: 'lines'}));
	//generate selector butons for line selection
	main_types_order.forEach(main_type => create_line_selector(get_routes_by_type(main_type), main_type));
	sec_types.forEach(sec_type => {
		let routes = get_routes_by_type(sec_type);
		if(routes.length>0){
			create_line_selector(routes, sec_type);
		}
		else{
			document.querySelector(`#line_selector_${sec_type}`).classList.add('d-none');
		}
	});
}

function init_updated_schedules_table(){
	document.querySelector('a[onclick="init_updated_schedules_table()"]').removeAttribute('onclick');
	//handles the table with last updated schedules
	var dates = {};
	data.trips.forEach(trip => {
		var date = trip.valid_from.split('.').reverse().join('-');
		if(!dates[date]){
			dates[date] = [];
		}
		var route = data.routes[trip.route_index];
		if(route){
			var schd = JSON.stringify([route.type, route.route_ref, trip.is_weekend]);
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
        var td0 = html_comp('td', {text: format_date_string(key), class: "align-middle"});
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
			tr.lastElementChild.appendChild(html_comp('span',  {text: route[1], class: get_route_colour_classes({line: route[1], type: route[0]})}));
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
function create_line_selector(routes, type){
	let oldContainer = document.querySelector(`#line_selector_${type}`).querySelector('.lines');
	let newContainer = oldContainer.cloneNode();
	routes.forEach(route => {
        let line_btn = generate_line_btn(route);
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
	stop_labels.forEach(label => label.innerText = string);
}

function filter_stops(text) {
	let code = Number(text);
	code = code!=0?code:false;
	text = text.toUpperCase();
	let show_stops = [];
	if(Number.isFinite(code)) {
		let str_code = code.toString();
		show_stops = data.stops.filter(stop => stop.code.toString().includes(str_code)).map(stop => stop.code);
	}
	if(!Number.isFinite(code)) {
		show_stops = data.stops.filter(stop => stop.names[lang.code].includes(text)).map(stop => stop.code);
	}

	let stops_trs = document.querySelectorAll('tr[data-stop-code]');
	console.log(code, text, show_stops)
	let currently_shown_stops = 0;
	for(let stop_row of stops_trs) {
		let is_stop_in_show_stops = show_stops.includes(Number(stop_row.dataset.stopCode));
		let show_stop = 
		(
			is_stop_in_show_stops
			|| show_stops.length == 0
		)
		&& stop_row.dataset.hidden != '1'
		&& currently_shown_stops<=maximum_stops_shwon_at_once;
		if(show_stop) {
			stop_row.classList.remove('d-none');
			currently_shown_stops++;
		}
		else {
			stop_row.classList.add('d-none');
		}
	}
}

function show_schedule(new_globals, overwrite_selectors=false, update_url=false){
	if(new_globals.is_route){
		schedule_display_div.classList.remove('d-none');
		stop_schedule_div.classList.add('d-none');
		new_globals.view = 'route';
	}
	if(new_globals.is_stop){
		schedule_display_div.classList.add('d-none');
		stop_schedule_div.classList.remove('d-none');
		new_globals.view = 'stop';
	}
	if(update_url){
		update_globals(new_globals);
	}
 
	//hide line selector
	line_selector_div.classList.add('d-none');
	tab_btns[0].show();
	if(new_globals.stop_code && (current.view=='stop' || current.is_stop)){
		//show stop schedule
		show_stop_schedule(new_globals.stop_code, new_globals.schedule_type);
	}
	else{
		configure_all_selectors(new_globals, overwrite_selectors);
		update_stop_labels(); //switches between "Subway station" and "Stop"
		configure_favourite_stop_button();
		configure_favourite_line_button();
	}
}

function are_options_matching(current_options, required_options) {
	let are_all_required_options_present = required_options.every(required_option => current_options.includes(required_option));
	let no_unwanted_options = current_options.every(current_option => required_options.includes(current_option));
	return are_all_required_options_present && no_unwanted_options;
}

function configure_all_selectors(predefined_values={}, overwrite_selectors=false){
	var route = current.route;
	console.log('predef', predefined_values)
	schedule_div.querySelector('#line').innerHTML = `${lang.line_type[route.type]} ${route.route_ref}`;
	schedule_div.querySelector('#line').setAttribute('class', get_route_colour_classes(route)+' fs-6');
	
	var current_weekday_options = Array.from(document.querySelectorAll('[name=route_schedule_type]:not(.d-none)')).map(el => is_weekend(el.value));
	var new_weekday_options = route.trip_indexes.map(trip_index => data.trips[trip_index].is_weekend).filter((item, index, arr) => arr.indexOf(item)==index);
	var weekday_selectors_ok = are_options_matching(current_weekday_options, new_weekday_options);
	if(!weekday_selectors_ok || overwrite_selectors){
		let index = new_weekday_options.indexOf(is_weekend(predefined_values.is_weekend));
		let selected_index = index!==-1?index:0;
		configure_weekday_selector(new_weekday_options, selected_index);
	}
	if(predefined_values.is_weekend) {	
		document.querySelector(`[name=route_schedule_type][value="${predefined_values.is_weekend+1-1}"]`).checked = true;
	}
	var is_weekend_val = is_weekend(document.querySelector('[name=route_schedule_type]:checked').value);
	
	var current_direction_options = Array.from(schedule_div.querySelector('#direction').querySelectorAll('option')).map(el => Number(el.value));
	//only fetch directions for the current valid thru interval
	var new_direction_options = data.trips.filter(trip => route.direction_codes.indexOf(trip.direction)!==-1 && trip.is_weekend==is_weekend_val).map(trip => trip.direction);
	var direction_options_ok = are_options_matching(current_direction_options, new_direction_options);
	if(!direction_options_ok || overwrite_selectors){
		let index = new_direction_options.indexOf(Number(predefined_values.direction));
		let selected_index = index!==-1?index:0;
		configure_direction_selector(new_direction_options, selected_index);
	}
	var direction = parseInt(schedule_div.querySelector('#direction').value);
	
	var current_stop_options = Array.from(schedule_div.querySelector('#route_stop_selector').querySelectorAll('option')).map(el => Number(el.value));
	console.log(data.directions.find(dir => dir.code==direction), direction)
	var new_stop_options = data.directions.find(dir => dir.code==direction).stops;
	var stop_options_ok = JSON.stringify(current_stop_options)==JSON.stringify(new_stop_options);
	if(!stop_options_ok || overwrite_selectors){
		let stop_index = new_stop_options.indexOf(Number(predefined_values.stop_code));
		let selected_index = stop_index!==-1?stop_index:0;
		configure_stop_selector(new_stop_options, selected_index);
	}
	current.stop_code = Number(document.querySelector('#route_stop_selector').value);

	var btn_group = document.querySelector('#route_btn_group');
	btn_group.children.item(0).dataset.code = current.stop_code;
	if(is_metro_stop(current.stop_code)){
		//btn_group.children.item(0).setAttribute('disabled', '');
	}
	else{
		//btn_group.children.item(0).removeAttribute('disabled');
	}
	btn_group.children.item(1).setAttribute('href', `${url_prefix}stop/${current.stop_code}/`);

	display_schedule();
}

function configure_weekday_selector(values, selected_index){
	let is_weekend_options = Array.from(document.querySelectorAll('[name=route_schedule_type]'));
	let remove_d_none = [];
	let add_d_none = [];
	if(values.includes(false)) {
		remove_d_none.push(is_weekend_options[0]);
		remove_d_none.push(is_weekend_options[0].nextElementSibling);
	}
	else {
		add_d_none.push(is_weekend_options[0]);
		add_d_none.push(is_weekend_options[0].nextElementSibling);
		if(selected_index == 0) {
			selected_index = 1;
		}
	}
	if(values.includes(true)) {
		remove_d_none.push(is_weekend_options[1]);
		remove_d_none.push(is_weekend_options[1].nextElementSibling);
	}
	else {
		add_d_none.push(is_weekend_options[1]);
		add_d_none.push(is_weekend_options[1].nextElementSibling);
		if(selected_index == 1) {
			selected_index = 0;
		}
	}

	remove_d_none.forEach(el => el.classList.remove('d-none'));
	add_d_none.forEach(el => el.classList.add('d-none'));
	is_weekend_options[selected_index].checked = true;
}
function generate_from_to_text(stops){
	let key_stops = [stops[0], 1038, stops[stops.length-1]]
	.filter((stop, index, arr) => arr.indexOf(stop) == index);
	let stops_names = key_stops.map(key_stop => stops.includes(key_stop)?get_stop_name(key_stop):false)
	.filter(stop_name => stop_name);
	return stops_names.join(' => ');
}
function configure_direction_selector(possible_directions, selected_index){
	let old_directions_select = schedule_div.querySelector('#direction');
	let new_directions_select = old_directions_select.cloneNode();

	for(const dir_code of possible_directions) {
		let direction = data.directions.find(dir => dir.code==dir_code);
		new_directions_select.appendChild(html_comp('option', {
			text: generate_from_to_text(direction.stops),
			value: dir_code
		}));
	}

    old_directions_select.replaceWith(new_directions_select);
	new_directions_select.selectedIndex = selected_index;
}
function configure_stop_selector(values, selected_index){
	let old_stop_el = schedule_div.querySelector('#route_stop_selector');
    let new_stop_el = old_stop_el.cloneNode();

	for(const stop_code of values) {
		let option = html_comp('option', {
			text: get_stop_string(stop_code),
			value: stop_code
		});
		new_stop_el.appendChild(option);
	}

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
function display_schedule(){
	const table = schedule_div.querySelector('#route_schedule_table');
	const old_tbody = table.querySelector('tbody');
	var route = current.route;
	var new_tbody = html_comp('tbody');
    var tr_thead = html_comp('tr');
    var tr_tbody = html_comp('tr');

	if(data.trips.filter(trip => trip.route_index==route.index).length==0){
		//no schedule
		tr_thead.appendChild(html_comp('th', {text: 'Липсва разписание за избраната линия.'}));
		new_tbody.appendChild(tr_thead);
		new_tbody.appendChild(tr_tbody);
		old_tbody.replaceWith(new_tbody);
		return;
	}

	var is_weekend_val = document.querySelector('[name=route_schedule_type]:checked').value === '1';
	var direction = parseInt(schedule_div.querySelector('#direction').value);
	// var display_by_car = schedule_div.querySelector('#display_by_car').checked;
	var display_by_car = false; // temporary disabled
	var stop_index = schedule_div.querySelector('#route_stop_selector').selectedIndex;
	
	var trip_index = data.trips.findIndex(trip => trip.route_index==current.route.index && trip.is_weekend === is_weekend_val && trip.direction === direction);
    var stop_times = data.stop_times.filter(stop_times => stop_times.trip === trip_index);
	// schedule_div.querySelector('#valid_from').innerText = format_date_string(data.trips[trip_index].valid_from);
	generate_stop_times_table(stop_times, stop_index, table, display_by_car);
}
function display_trip_schedule(stop_time_index){
	const stop_time = data.stop_times[stop_time_index];

    var times = stop_time.times;
	var dir_code = data.trips[stop_time.trip].direction;
	var route_stops = data.directions.find(dir => dir.code==dir_code).stops;
	
	var modal = document.querySelector('#schedule_modal');
	var old_tbody = modal.querySelector('tbody');
	var new_tbody = html_comp('tbody');

	times.forEach((time, stop_index) => {
		var tr = html_comp('tr');
		var highlight_row = route_stops[stop_index]==current.stop_code?'bg-warning':'';
        const stop = get_stop(route_stops[stop_index]) || false;
		if(highlight_row){
			tr.classList.add('bg-warning');
		}
		tr.appendChild(html_comp('td', {text: format_stop_code(route_stops[stop_index]), class: 'align-middle'}));
		tr.appendChild(html_comp('td', {text: get_stop_name(stop?.code)}));
		tr.appendChild(html_comp('td', {text: format_time(time), class: 'align-middle'}));
		new_tbody.append(tr);
	});
	old_tbody.replaceWith(new_tbody);
}
function update_globals(new_globals=false){
	if(new_globals.view){
		//stop or route
		current.view = new_globals.view;
	}
	if(current.view=='stop'){
		current.route = null;
		current.trip = null;
		current.stop_code = null;
	}
	else{
		if(new_globals.route){
			current.route = new_globals.route;
		}
		if(new_globals.trip){
			current.trip = new_globals.trip;
		}
		else{
			try {
				current.trip = data.trips.find(trip => 
					trip.route_index==current.route.index 
					&& trip.direction==document.querySelector('#direction').value 
					&& trip.is_weekend==document.querySelector('[name=stop_schedule_type]:checked').value
				);
			}
			catch {
				current.trip = data.trips[current.route.trip_indexes[0]];
			}
		}
		if(!current.trip){
			current.trip = data.trips[current.route.trip_indexes[0]];
		}
		// if(new_globals.direction){
		// 	current.direction = data.directions.find(dir => dir.code==new_globals.direction);
		// }
		// else{
			current.direction = data.directions.find(dir => dir.code==current.trip.direction);
		// }
		if(new_globals.stop_code){
			current.stop_code = parseInt(new_globals.stop_code);
		}
		else{
			current.stop_code = parseInt(schedule_div.querySelector('#route_stop_selector').value);
		}
	}
	/*if(!current.direction){
		current.direction = directions.find(dir => dir.code==current.route.directions[0]);
	}*/
	
	if(new_globals.stop_code){
		current.stop_code = parseInt(new_globals.stop_code);
	}
	else if(!current.stop_code){
		current.stop_code = current.direction.stops[0];
	}
}
function show_stop_schedule(stop_code, type){
	if(typeof stop_code=='string'){
		stop_code = Number(stop_code);
	}

	//stop_schedule_div.querySelector('button[data-bs-target]').disabled = is_metro_stop(stop_code);
	stop_schedule_div.querySelector('#stop_name').innerText = get_stop_string(stop_code);
	var relevant_directions = data.directions.filter(dir => dir.stops.indexOf(stop_code)!==-1);
	//var stop_indexes = relevant_directions.map(dir => dir.stops.indexOf(stop_code));
	var direction_codes = relevant_directions.map(dir => dir.code);
	var local_routes = direction_codes.map(direction_code => {
		var route = data.routes.find(route => route.direction_codes.indexOf(direction_code)!=-1);
		if(!route){
			//undefined because of M1/M2
			return;
		}
		var result = {};
		result.type = route.type;
		if(route.subtype){
			result.subtype = route.subtype;
		}
		result.route_index = route.index;
		result.route_ref = route.route_ref;
		result.stops = data.directions.find(dir => dir.code==direction_code).stops;
		result.trip_indexes = data.trips.map((trip, index) => {trip.index = index; return trip;}).filter(trip => /*trip.route_index == route.index &&*/ trip.direction == direction_code).map(trip => trip.index);
		result.stop_times = data.stop_times.filter(stop_time => result.trip_indexes.indexOf(stop_time.trip)!=-1);
		return result;
	})
	.filter(route => route) //drop undefined because of M1/M2
	.toSorted((a,b)=>a.route_index>b.route_index);
	console.log(local_routes);
	
	var new_stop_schedule_div = stop_schedule_div.querySelector('#stop_schedule_tables').cloneNode();
	local_routes.forEach(route => {
		route.trip_indexes.forEach(trip_index => {
			//var trip_index = data[0];
			var div = html_comp('div');
			var num_div = html_comp('div');
			num_div.appendChild(html_comp('span', {text: `${lang.line_type[route.type]} ${route.route_ref}`, class: get_route_colour_classes(route)}))
			num_div.appendChild(html_comp('br'));
			num_div.appendChild(html_comp('span', {text: `${generate_from_to_text(route.stops)}`}));
			div.appendChild(num_div);
			div.dataset.is_weekend = data.trips[trip_index].is_weekend;
			var table = html_comp('table');
			table.classList.add('schedule_table', 'table', 'table-bordered', 'table-striped-columns', 'table-flip');
			var tbody = html_comp('tbody');
			table.appendChild(tbody);
			var stop_times = data.stop_times.filter(stop_time => stop_time.trip==trip_index);
			generate_stop_times_table(stop_times, route.stops.indexOf(stop_code), table);
			div.appendChild(table);
			new_stop_schedule_div.appendChild(div);
		});
	});
	
	stop_schedule_div.querySelector('#stop_schedule_tables').replaceWith(new_stop_schedule_div);
	if(type){
		document.querySelector(`[name=stop_schedule_type][value="${type}"]`).checked = true;
	}
	else{
		document.querySelector('[name=stop_schedule_type]').checked = true;
		type = document.querySelector('[name=stop_schedule_type]:checked').value;
	}
	show_stop_schedule_by_type(type);
}
function show_stop_schedule_by_type(type, update_url=false){
	let requested_weekend = is_weekend(type);
	stop_schedule_div.querySelectorAll('div[data-is_weekend]').forEach(table => {
		var table_is_weekend = is_weekend(table.dataset.is_weekend);
		if(table_is_weekend == requested_weekend){
			table.classList.remove('d-none');
		}
		else{
			table.classList.add('d-none');
		}
	});
	if(update_url) {
		updateURL();
	}
}
function preprocess_stop_times(stop_times, stop_index, by_cars=false){
	return stop_times.map(stop_time => {
		if(stop_time.time==''){
			return;
		}
		let result = {
			time: stop_time.times[stop_index],
			index: stop_time.index,
			incomplete_course_start: !stop_time.times[0],
			incomplete_course_final: !stop_time.times[stop_time.times.length-1]
		};
		if(by_cars){
			result.car = stop_time.car;
		}
		return result;
	})
	.toSorted((a, b) => a.time-b.time);
}
function generate_stop_times_table(stop_times, stop_index, table, by_cars=false){
	var new_tbody = html_comp('tbody');
    var tr_thead = html_comp('tr');
    var tr_tbody = html_comp('tr');
	var processed_stop_times = preprocess_stop_times(stop_times, stop_index, by_cars);

	var total_columns = by_cars?Math.max(...processed_stop_times.map(a => a.car)):24;
	for(let i=0;i<total_columns;i++){
		let head_cell = html_comp('th', {text: by_cars?i+1:i});
		tr_thead.appendChild(head_cell);
		let body_cell = html_comp('td');
		tr_tbody.appendChild(body_cell);
	}

	var body_cells = Array.from(tr_tbody.querySelectorAll('td'));
	processed_stop_times.forEach(stop_time => {
		if(stop_time.time=='' || !stop_time.time){
			return;
		}
		var el_class = '';
		var hour = Math.floor(stop_time.time/60);
		if(hour>=24 && !by_cars){
			hour -= 24;
		}
		if(stop_time.incomplete_course_start){
			el_class = 'bg-warning';
		}
		else if(stop_time.incomplete_course_final){
			el_class = 'text-white bg-danger';
		}
		var el = html_comp('span', {
			text: format_time(by_cars?stop_time.time:stop_time.time%60, !by_cars),
			'data-bs-toggle': 'modal',
			'data-bs-target': '#schedule_modal',
			type: 'button',
			'data-stop-time-index': stop_time.index,
			onclick: 'display_trip_schedule(this.dataset.stopTimeIndex)',
			class: el_class
		});
		if(!by_cars){
			body_cells[hour].appendChild(el);
			body_cells[hour].appendChild(html_comp('span', {class: 'line-break'}));
		}
		else{
			console.log(stop_time.car);
			body_cells[stop_time.car-1].appendChild(el);
			body_cells[stop_time.car-1].appendChild(html_comp('span', {class: 'line-break'}));
		}
	});
    new_tbody.appendChild(tr_thead);
    new_tbody.appendChild(tr_tbody);
	table.querySelector('tbody').replaceWith(new_tbody);
}

async function load_virtual_board(stop_code) {
	function generate_virtual_board_row(route, row_index, new_tbody) {
		let tr = html_comp('tr');
		let td1 = html_comp('td');
		let span = html_comp('span', {class: get_route_colour_classes(route), text: route.route_ref});
		td1.appendChild(span);
		tr.appendChild(td1);

		for(const time of route.times) {
			let td = html_comp('td');
			td.appendChild(document.createTextNode(format_time(date.getHours()*60+date.getMinutes()+time.t, false)));
			td.appendChild(document.createTextNode(' '));
			if(time.wheelchair){
				td.appendChild(html_comp('i', {class: 'bi bi-person-wheelchair'}));
			}
			if(time.ac){
				td.appendChild(html_comp('i', {class: 'bi bi-snow'}));
			}
			if(time.bike_rack){
				td.appendChild(html_comp('i', {class: 'bi bi-bicycle'}));
			}
			tr.appendChild(td);
		}
		let needed_cells = 3-route.times.length;
		while(needed_cells>0) {
			tr.appendChild(html_comp('td', {text: '-'}));
			needed_cells--;
		}
		if(row_index == 0) {
			tr.children.item(0).classList.add('col-2');
			tr.children.item(1).classList.add('col-3');
			tr.children.item(2).classList.add('col-3');
			tr.children.item(3).classList.add('col-3');
		}
		new_tbody.appendChild(tr);
	}
	const date = new Date;
	let generated_at_el = document.querySelector('#generated_at');
	generated_at_el.innerText = '';
	generated_at_el.nextElementSibling.setAttribute('disabled', '');
	var table = document.querySelector('table#virtual_board_table');
	var thead = table.querySelector('thead');
	thead.querySelector('th').innerText = get_stop_string(stop_code);
	var old_tbody = table.querySelector('tbody');
	var new_tbody = old_tbody.cloneNode();
	
	let loading_row = html_comp('tr');
	let loading_td = html_comp('th', {colspan: 4});
	let loading_div = html_comp('div', {class: 'spinner-border my-2', style: 'width: 3rem; height: 3rem; border-width: 4.5px;', role: 'status'});
	loading_td.appendChild(loading_div);
	loading_row.append(loading_td);
	new_tbody.appendChild(loading_row);
	old_tbody.replaceWith(new_tbody);
	fetch(`https://sofiatraffic-proxy.onrender.com/virtual-board?stop_code=${format_stop_code(stop_code)}`)
	.then(data => data.json())
	.then(routes_data => {
		if(routes_data.status == 'ok'){
			loading_row.remove();
			if(routes_data.routes.length == 0) {
				let tr = html_comp('tr');
				let td = html_comp('td', {colspan: 4, text: 'Няма повече потегляния за деня', class: 'text-center'});
				tr.appendChild(td);
				new_tbody.appendChild(tr);
			}
			routes_data.routes.forEach((route, row_index) => {
				if(!route.route_ref) {
					route.route_ref = route.ref;
				}
				generate_virtual_board_row(route, row_index, new_tbody);
			});
		}
		else{
			loading_row.innerText = `${routes_data.status}\n${routes_data.message}`;
		}
		generated_at_el.innerText = new Date(routes_data.generated_at).toLocaleString(lang.code);
		generated_at_el.nextElementSibling.dataset.code = stop_code;
		generated_at_el.nextElementSibling.removeAttribute('disabled');
	})
	.catch(err => {
		console.log(err);
		let tr = html_comp('tr');
		let td = html_comp('td', {colspan: 4, text: `Няма връзка със сървъра или интернет`, class: 'text-center'});
		tr.appendChild(td);
		new_tbody.appendChild(tr);

		loading_row.remove();
		generated_at_el.nextElementSibling.dataset.code = stop_code;
		generated_at_el.nextElementSibling.removeAttribute('disabled');
	});
}