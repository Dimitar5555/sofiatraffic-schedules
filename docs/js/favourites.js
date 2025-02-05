const favourite_stops_div = document.querySelector('#favourite_stops');
function gen_route_json(){
	return `${current.route.type}\_${current.route.route_ref}`;
}
function init_favourites(){
	show_favourite_lines();
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
	let routes = favourite_lines.map(fav_line => data.routes.find(route => route.type == fav_line[0] && route.route_ref == fav_line[1]))
	.toSorted((a, b) => a.index - b.index);
	
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
	configure_favourite_stop_button(favourite_stops);
	window.localStorage.setItem('favourite_stops', JSON.stringify(favourite_stops));
}
