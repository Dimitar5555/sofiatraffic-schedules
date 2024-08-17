const favourite_stops_div = document.querySelector('#favourite_stops');
function gen_route_json(){
	return `${current.route.type}\_${current.route.line}`;
}
function init_favourites(){
	show_favourite_lines();
}
function show_favourite_stops(favourite_stops=false){
	if(!favourite_stops){
		favourite_stops = get_favourite_stops();
	}
	var favourite_stops_tbody = document.querySelector('#favourite_stops_tbody');
	let regular_stops_tbody = document.querySelector('#stops_list');
	if(favourite_stops.length == 0) {
		favourite_stops_tbody.classList.add('d-none');
		return;
	}
	favourite_stops_tbody.classList.remove('d-none');
	let current_rows = favourite_stops_tbody.querySelectorAll('[data-stop-code]');
	let has_stops = [];
	for(let stop_row of current_rows) {
		let stop_code = stop_row.dataset.stopCode;
		if(!stop_code) {
			continue;
		}
		if(!favourite_stops.includes(stop_code)) {
			stop_row.remove();
			regular_stops_tbody.querySelector(`[data-stop-code="${stop_code}"`).dataset.hidden = 0;
		}
		else {
			has_stops.push(stop_code);
		}
	}
	let missing_stops = favourite_stops.filter(stop => !has_stops.includes(stop));
	console.log(favourite_stops, has_stops, missing_stops)
	for(let stop_code of missing_stops) {
		let stop_row = regular_stops_tbody.querySelector(`[data-stop-code="${stop_code}"]`);
		console.log(stop_code, stop_row)
		let clone = stop_row.cloneNode(true);
		clone.classList.remove('d-none');
		favourite_stops_tbody.appendChild(clone);
		stop_row.dataset.hidden = 1;
		stop_row.classList.add('d-none');
	}
	/*
	var new_tbody = old_tbody.cloneNode();
	new_tbody.appendChild(html_comp('th', {text: lang.schedules.favourite_stops, colspan: 4}));
	favourite_stops.forEach(stop_code => {

		//new_tbody.appendChild(generate_stop_row(get_stop(stop_code)));
	});
	old_tbody.replaceWith(new_tbody);*/
}
function show_favourite_lines(favourite_lines=false){
	if(!favourite_lines){
		favourite_lines = get_favourite_lines();
	}
	favourite_lines = favourite_lines.map(fl => fl.split('_'));
	var old_div = document.querySelector('#line_selector_favourites').querySelector('.lines');
	if(favourite_lines.length==0){
		old_div.parentElement.classList.add('d-none');
		return;
	}
	
	old_div.parentElement.classList.remove('d-none');
	var new_div = old_div.cloneNode();
	let routes = data.routes.filter(route => favourite_lines.some(favourite_line => favourite_line[0] == route.type && favourite_line[1] == route.line));
	
	routes.forEach(route => {
		var line_btn = generate_line_btn(route);
		new_div.appendChild(line_btn);
	});
	old_div.replaceWith(new_div);
}
function get_favourite_lines(){
	return JSON.parse(window.localStorage.getItem('favourite_lines')) || [];
}
function add_remove_favourite_line(){
	var favourite_lines = get_favourite_lines();
	var cur_route_json = gen_route_json();
	if(favourite_lines.indexOf(cur_route_json)==-1){
		favourite_lines.push(cur_route_json);
	}
	else{
		favourite_lines.splice(favourite_lines.indexOf(cur_route_json), 1);
	}
	console.log('cakked fav lines with ', favourite_lines)
	show_favourite_lines(favourite_lines);
	configure_favourite_line_button(favourite_lines);
	window.localStorage.setItem('favourite_lines', JSON.stringify(favourite_lines));
}
function get_favourite_stops(){
	return JSON.parse(window.localStorage.getItem('favourite_stops')).map(stop => parseInt(stop)) || [];
}
function add_remove_favourite_stop(stop_code){
	var favourite_stops = get_favourite_stops();
	if(favourite_stops.indexOf(stop_code)==-1){
		favourite_stops.push(stop_code);
	}
	else{
		favourite_stops.splice(favourite_stops.indexOf(stop_code), 1);
	}
	//show_favourite_stops(favourite_stops);
	configure_favourite_stop_button(favourite_stops);
	window.localStorage.setItem('favourite_stops', JSON.stringify(favourite_stops));
}
