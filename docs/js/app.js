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
		document.title = lang.title;

		nav_links.item(0).innerText = lang.nav.schedules;
		nav_links.item(1).innerText = lang.nav.favourites;

		var footer_spans = document.querySelector('footer').querySelectorAll('span');
		footer_spans.item(0).innerText = lang.footer.last_data_update;
		footer_spans.item(2).innerText = lang.footer.last_site_update;
	});

	check_metadata();
}
function check_metadata(){
	fetch('data/metadata.json')
	.then(response => response.text())
	.then(text => JSON.parse(text))
	.then(metadata => {
		localStorage.app_version = metadata.app_version;
		localStorage.retrieval_date = metadata.retrieval_date;
		update_versions();
		return fetch_data(metadata);
	});
}
function update_versions(){
	document.querySelector('#last_data_update').innerText = localStorage.retrieval_date;
	document.querySelector('#version').innerText = localStorage.app_version;
}
function fetch_data(metadata=false){
	var promises = [];
	var force_stops = false;
	var force_sched = false;
	if(localStorage.stops_hash!==metadata.stops_hash){
		force_stops = true;
	}
	if(localStorage.routes_hash!==metadata.routes_hash){
		force_sched = true;
	}

	promises.push(fetch(`data/stops.json${force_stops?'?force_update':''}`)
	.then(response => response.json())
	.then(stops => {
		window.stops = stops;
		localStorage.stops_hash = metadata.stops_hash;
		init_favourtie_stops();
	}));
	promises.push(fetch(`data/schedule.json${force_sched?'?force_update':''}`)
	.then(response => response.json())
	.then(routes => {
		window.routes = routes;
		localStorage.routes_hash = metadata.routes_hash;
		init_schedules();
	}));

	return Promise.all(promises);
}
//try to update metadata every hour
var update_interval;
addEventListener('online', (event) => {
	check_metadata();
	update_interval = window.setInterval(()=>check_metadata(), 1000*60*60);
});
addEventListener('offline', (event) => {
	window.clearInterval(update_interval);
});

//register service worker
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('sw.js')
	.catch((err) => alert('Service worker registration FAIL:', err));
}
init();