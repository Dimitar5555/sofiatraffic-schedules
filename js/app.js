const schedule_div = document.querySelector('#schedule');
const line_selector_div = document.querySelector('#line_selector');
const schedule_display_div = document.querySelector('#schedule_display');

const allowed_language = ['bg'];

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
		localStorage.setItem('lang', navigator.languages.map(lang => lang.split('-')[0]).find(lang => allowed_language.indexOf(lang)!==-1));
	}
	if(!localStorage.getItem('favourite_stops')){
		localStorage.setItem('favourite_stops', '[]');
	}
	fetch(`/i18n/${localStorage.lang}.json`)
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
		.then((registration) => {
			const data = {
				type: 'CACHE_URLS',
				payload: [
					location.href,
					'/data/schedule.json',
					'/data/stops.json',
					'/js/app.js',
					'/js/schedules.js',
					'/js/virtual_sign.js',
					'/js/bootstrap.bundle.min.js',
					'sw.js',
					'/i18n/bg.json',
					'/i18n/en.json',
					'/css/bootstrap.min.css',
					'/css/bootstrap-icons.css',
					'/css/style.css',
					'/fonts/SofiaSan-Bold.ttf',
					'/fonts/SofiaSan-Medium.ttf',
					'/fonts/SofiaSan-Regular.ttf',
					'fonts/bootstrap-icons.woff',
					'fonts/bootstrap-icons.woff2'
				]
			};
		})
		.catch((err) => alert('Service worker registration FAIL:', err));
}
