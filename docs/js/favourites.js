const favourite_stops_div = document.querySelector('#favourite_stops');
function gen_route_json(){
	return `${current.route.type}\_${current.route.line}`;
}
function init_favourites(){
	show_favourite_stops();
	show_favourite_lines();
}
function show_favourite_stops(favourite_stops=false){
	if(!favourite_stops){
		favourite_stops = get_favourite_stops();
	}
	var table = favourite_stops_div.querySelector('table#favourite_stops_table');
	var old_tbody = table.querySelector('tbody');
	var new_tbody = html_comp('tbody');
	favourite_stops.forEach(stop_code => {
		var tr = html_comp('tr');
		tr.appendChild(html_comp('td', {text: format_stop_code(stop_code), class: 'align-middle'}));
		tr.appendChild(html_comp('td', {text: get_stop_name(stop_code), class: 'align-middle'}));
		var td1 = html_comp('td');
		//TODO FIX
		var btn_group = html_comp('div', {class: 'btn-group'});
		btn_group.appendChild(html_comp('button', {'data-bs-toggle':'modal', 'data-bs-target': '#sofiatraffic_live_data', 'data-url': `https://sofiatraffic.bg/bg/transport/virtual-tables/${format_stop_code(stop_code)}`, text: lang.actions.virtual_table, onclick: 'document.querySelector("iframe").setAttribute("src", this.dataset.url)', class: 'btn btn-outline-primary'}));
        btn_group.appendChild(html_comp('button', {text: lang.schedules.schedule, onclick: `show_schedule({stop_code: ${stop_code}, is_stop: true})`, class: 'btn btn-outline-primary'}));
		td1.appendChild(btn_group);
		//td1.appendChild(document.createTextNode(' '));
		//td1.appendChild(html_comp('a', {href: `"++"`, text: 'Разписание', target: '_blank'}));
		tr.appendChild(td1);
		new_tbody.appendChild(tr);
	});
	old_tbody.replaceWith(new_tbody);
}
function show_favourite_lines(favourite_lines=false){
	if(!favourite_lines){
		favourite_lines = get_favourite_lines();
	}
	var old_div = document.querySelector('#line_selector_favourites').querySelector('.lines');
	var new_div = old_div.cloneNode();
	if(favourite_lines.length==0){
		old_div.parentElement.classList.add('d-none');
		return;
	}

	old_div.classList.remove('d-none');
	let routes = favourite_lines.map(data => {
		var line = data.split('_');
		return data.routes.find(a => a.line==line[1] && a.type==line[0]);
	});
	routes.sort();
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
	show_favourite_lines(favourite_lines);
	configure_favourite_line_button(favourite_lines);
	window.localStorage.setItem('favourite_lines', JSON.stringify(favourite_lines));
}
function get_favourite_stops(){
	return JSON.parse(window.localStorage.getItem('favourite_stops')).map(stop => parseInt(stop)) || [];
}
function add_remove_favourite_stop(){
	var favourite_stops = get_favourite_stops();
	if(favourite_stops.indexOf(current.stop_code)==-1){
		favourite_stops.push(current.stop_code);
	}
	else{
		favourite_stops.splice(favourite_stops.indexOf(current.stop_code), 1);
	}
	show_favourite_stops(favourite_stops);
	configure_favourite_stop_button(favourite_stops);
	window.localStorage.setItem('favourite_stops', JSON.stringify(favourite_stops));
}
