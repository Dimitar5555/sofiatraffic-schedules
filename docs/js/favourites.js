const favorite_stops_div = document.querySelector('#favorite_stops');
function gen_route_json(){
	return `${routes[current_route_index].type}\_${routes[current_route_index].line}`;
}
function init_favourites(){
	var ths = favorite_stops_div.querySelectorAll('th');
	ths.item(0).innerText = lang.favourites.stop;
	ths.item(1).innerText = lang.favourites.actions;

	show_favourite_stops();
	show_favourite_lines();
}
function show_favourite_stops(favourite_stops=false){
	if(!favourite_stops){
		favourite_stops = JSON.parse(window.localStorage.getItem('favourite_stops'));
	}
	var table = favorite_stops_div.querySelector('table#stops');
	var old_tbody = table.querySelector('tbody');
	var new_tbody = html_comp('tbody');
	favourite_stops.forEach(stop => {
		var tr = html_comp('tr');
		tr.appendChild(html_comp('td', {text: `[${stop}] ${get_stop_name(stop)}`}));
		var td1 = html_comp('td');
		td1.appendChild(html_comp('a', {href: `https://sofiatraffic.bg/bg/transport/virtual-tables/${stop}`, text: lang.favourites.virtual_table, target: '_blank'}));
		//td1.appendChild(document.createTextNode(' '));
		//td1.appendChild(html_comp('a', {href: `"++"`, text: 'Разписание', target: '_blank'}));
		tr.appendChild(td1);
		new_tbody.appendChild(tr);
	});
	table.replaceChild(new_tbody, old_tbody);
}
function show_favourite_lines(favourite_lines=false){
	if(!favourite_lines){
		favourite_lines = JSON.parse(window.localStorage.getItem('favourite_lines'));
	}
	var table = favorite_stops_div.querySelector('table#lines');
	var old_tbody = table.querySelector('tbody');
	var new_tbody = html_comp('tbody');
	favourite_lines.forEach(data => {
		var line = data.split('_');
		var tr = html_comp('tr');
		td0 = html_comp('td');
		tr.appendChild(td0);
		var route_index = routes.findIndex(a => a.line==line[1] && a.type==line[0]);
		generate_line_btn(route_index, td0);
		var td1 = html_comp('td');
		td1.appendChild(html_comp('a', {href: `https://sofiatraffic.bg/bg/transport/virtual-tables/dsds`, text: lang.favourites.virtual_table, target: '_blank'}));
		//td1.appendChild(document.createTextNode(' '));
		//td1.appendChild(html_comp('a', {href: `"++"`, text: 'Разписание', target: '_blank'}));
		tr.appendChild(td1);
		new_tbody.appendChild(tr);
	});
	table.replaceChild(new_tbody, old_tbody);
}
function get_favourite_lines(){
	return JSON.parse(window.localStorage.getItem('favourite_lines')) || [];
}
function add_remove_favourite_line(){
	var favourite_lines = get_favourite_lines();
	var r = routes[current_route_index];
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
	return JSON.parse(window.localStorage.getItem('favourite_stops')) || [];
}
function add_remove_favourite_stop(id){
	var favourite_stops = get_favourite_stops();
	if(favourite_stops.indexOf(id)==-1){
		favourite_stops.push(id);
	}
	else{
		favourite_stops.splice(favourite_stops.indexOf(id), 1);
	}
	show_favourite_stops(favourite_stops);
	configure_favourite_stop_button(favourite_stops);
	window.localStorage.setItem('favourite_stops', JSON.stringify(favourite_stops));
}