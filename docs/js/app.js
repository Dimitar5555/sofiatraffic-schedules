const schedule_div = document.querySelector('#schedule');
const schedule_display_div = document.querySelector('#schedule_display');
var line_selector_div = document.querySelector('#line_selector');

const allowed_languages = ['bg'];
const main_types = ['metro', 'tramway', 'trolleybus', 'autobus'];
const sec_types = ['temporary', 'school', 'night'];

current = {
	route: null, trip: null, stop_code: null
};

function updateURL(){
	const url = `#${current.route.type}/${current.route.line}/${current.trip.valid_thru}/${current.trip.direction}/${current.stop_code}/`;
	history.pushState({}, '', url);
}
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
function init(debug=false){
	if(!localStorage.getItem('lang')){
		var cur_lang = navigator.languages.map(lang => lang.split('-')[0]).find(lang => allowed_languages.indexOf(lang)!==-1);
		localStorage.setItem('lang', cur_lang?cur_lang:'bg');
	}
	if(!localStorage.getItem('favourite_stops')){
		localStorage.setItem('favourite_stops', '[]');
	}
	if(!localStorage.getItem('favourite_lines')){
		localStorage.setItem('favourite_lines', '[]');
	}

	fetch(`i18n/${localStorage.lang}.json`)
	.then(response => response.json())
	.then((response) => {
        lang = response;
	    
        const i18n_els = document.querySelectorAll('[data-i18n]');
        Array.from(i18n_els)
        .map(el => {
            var path = el.dataset.i18n.split('.');
            var string = path.reduce((acc, cur) => acc[cur], response);
            if(!string){
                alert(el.dataset.i18n);
            }
            el.innerHTML = debug?`{{${el.dataset.i18n}}}`:string;
        });
	});

	check_metadata()
	.then(() => {
		if(window.location.hash){
			var hash = decodeURIComponent(window.location.hash).replace('#', '').split('/');
			if(main_types.indexOf(hash[0]) !== -1){
				var type = hash[0];
				var line = hash[1];
				var route_index = routes.findIndex(route => route.type==type && route.line==line);
				if(route_index!=-1){
					var valid_thru = hash[2];
					var direction_code = Number(hash[3]);
					var stop = Number(hash[4]);
					var trip = trips.find(trip => trip.route_index==route_index && trip.direction==direction_code && trip.valid_thru==valid_thru);
					//update_globals({route: routes[route_index], trip: trip, stop: stop, direction: direction})
					//current.route = routes[route_index];
					//current.stop = stop_code;
					var data = {route: routes[route_index], valid_thru: valid_thru, direction: directions.find(dir => dir.code==direction_code), stop: stop, trip: trip};
					console.log(data);
					show_schedule(data);
				}
			}
		}
	});
}
function check_metadata(){
	return fetch('data/metadata.json')
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
	document.querySelector('#app_version').innerText = localStorage.app_version;
}
function fetch_data(metadata=false){
	var promises = [];

	promises.push(fetch('data/stops.json')
	.then(response => response.json())
	.then(stops => {
		window.stops = stops;
		localStorage.stops_hash = metadata.stops_hash;
	}));
	promises.push(fetch('data/routes.json')
	.then(response => response.json())
	.then(routes => {
		window.routes = routes;
		localStorage.routes_hash = metadata.routes_hash;
	}));
	promises.push(fetch('data/trips.json')
	.then(response => response.json())
	.then(trips => {
		window.trips = trips;
		localStorage.trips_hash = metadata.trips_hash;
	}));
	promises.push(fetch('data/directions.json')
	.then(response => response.json())
	.then(directions => {
		window.directions = directions;
		localStorage.directions_hash = metadata.directions_hash;
	}));
	promises.push(fetch('data/stop_times.json')
	.then(response => response.json())
	.then(stop_times => {
		window.stop_times = stop_times;
		localStorage.stop_times_hash = metadata.stop_times_hash;
	}));
	return Promise.all(promises)
	.then(()=>{
		init_schedules();
		init_favourites();
	});
}
function generate_line_btn(route_index){
	var route = routes[route_index];
	var el = html_comp('button', {
		text: routes[route_index].line,
		class: `line_selector_btn text-${route.line=='M4'?'dark':'light'} rounded-1 ${route.type!=='metro'?route.type:route.line}-bg-color`,
		'onclick': `show_schedule({route: routes[${route_index}]})`
	});
	return el;
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
