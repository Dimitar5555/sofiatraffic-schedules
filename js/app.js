const schedule_div = document.querySelector('#schedule');
const line_selector_div = document.querySelector('#line_selector');
const schedule_display_div = document.querySelector('#schedule_display');

var current_route_index;

function html_comp(tag, attributes={}){
	var el = document.createElement(tag);
	var keys = Object.keys(attributes);
	keys.forEach(key => {
		if(key=='text'){
			el.innerText = attributes[key];
			return;
		}
		el.setAttribute(key, attributes[key])});
	return el;
}
function replace_child(new_child, old_child){
	old_child.parentElement.replaceChild(new_child, old_child);
}
function init(){
	fetch('data/schedule.json')
	.then(response => response.json())
	.then(routes => {
		window.routes = routes;
		fetch('data/stops.json')
		.then(response => response.json())
		.then(stops => {
			window.stops = stops;
			init_schedules();
			init_favourtie_stops();
		});
	});
	if(!localStorage.getItem('favourite_stops')){
		localStorage.setItem('favourite_stops', '[]');
	}
}
init();

//register service worker
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('sw.js')
		.then((registration) => {
			const data = {
				type: 'CACHE_URLS',
				payload: [
					location.href,
					'/data/schedule.json',
					'/data/stops.json',
					'/js/app.js',
					'/js/schedules.js',
					'/js/virtual_sign.js'
				]
			};
			registration.installing.postMessage(data);
		})
		// .catch((err) => console.log('Service worker registration FAIL:', err));
}