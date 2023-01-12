const favorite_stops_div = document.querySelector('#favorite_stops');
function init_favourtie_stops(){
	var ths = favorite_stops_div.querySelectorAll('th');
	ths.item(0).innerText = lang.favourites.stop;
	ths.item(1).innerText = lang.favourites.actions;

	show_favourite_stops();
}
function show_favourite_stops(favourite_stops=false){
	if(!favourite_stops){
		favourite_stops = JSON.parse(window.localStorage.getItem('favourite_stops'));
	}
	var table = favorite_stops_div.querySelector('table');
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
	})
	table.replaceChild(new_tbody, old_tbody);
}
function add_remove_favourite_stop(id){
	var favourite_stops = JSON.parse(window.localStorage.getItem('favourite_stops'));;
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