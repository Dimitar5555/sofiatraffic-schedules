const schedule_div = document.querySelector('#schedule');
const schedule_display_div = document.querySelector('#schedule_display');
var line_selector_div = document.querySelector('#line_selector');

const allowed_languages = ['bg'];

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
	if(!localStorage.getItem('lang')){
		var cur_lang = navigator.languages.map(lang => lang.split('-')[0]).find(lang => allowed_languages.indexOf(lang)!==-1);
		localStorage.setItem('lang', cur_lang?cur_lang:'bg');
	}
	if(!localStorage.getItem('favourite_stops')){
		localStorage.setItem('favourite_stops', '[]');
	}
	fetch(`i18n/${localStorage.lang}.json`)
	.then(response => response.text())
	.then(response => lang = JSON.parse(response))
	.then(() => {
		var nav_links = document.querySelectorAll('.nav-item');
		nav_links.item(0).innerText = lang.nav.schedules;
		nav_links.item(1).innerText = lang.nav.favourites;
		document.title = lang.title;
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
	});
}
init();

//register service worker
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('sw.js')
	.catch((err) => alert('Service worker registration FAIL:', err));
}