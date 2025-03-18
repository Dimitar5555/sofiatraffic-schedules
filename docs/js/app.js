const schedule_div = document.querySelector('#schedules');
const schedule_display_div = document.querySelector('#schedule_display');
var line_selector_div = document.querySelector('#line_selector');
const stop_schedule_div = document.querySelector('#stop_schedule');

const allowed_languages = ['bg'];
const main_types = {
	metro: 'metro',
	tram: 'tram',
	trolley: 'trolley',
	bus: 'bus'
};
const main_types_order = [
	main_types.metro, 
	main_types.tram, 
	main_types.trolley,
	main_types.bus];
const sec_types = ['temporary', 'school', 'night'];

const tab_btns = Array.from(document.querySelector('nav').children).map(btn => new bootstrap.Tab(btn));

const maximum_stops_shown_at_once = 6;

current = {
	route: null, trip: null, stop_code: null, view: null
};

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
	.then(response => {
        lang = response;
	    
		function show_string(el, key='innerText') {
			const i18n_key = key!='innerText'?`data-i18n-${key}`:'data-i18n';
			const full_path = el.getAttribute(i18n_key);
			const split_path = full_path.split('.');
			try {
				const string = split_path.reduce((acc, cur) => acc[cur], response);
				if(!string){
					throw(new Error());
				}
				el[key] = debug?`{{${full_path}}}`:string;
			}
			catch(err) {
				console.error(`Missing string: ${full_path}`)
			}
		}

        const i18n_els = document.querySelectorAll('[data-i18n]');
        i18n_els.forEach(el => show_string(el));

		const i18n_els_placeholder = document.querySelectorAll('[data-i18n-placeholder]');
		i18n_els_placeholder.forEach(el => show_string(el, 'placeholder'));
	});

	
	check_metadata()
	.then(() => {
		let new_item = generate_btn_group(1, [STOP_BTN_TYPES.departures_board, STOP_BTN_TYPES.schedule], true);
		let old_item = document.querySelector('#route_btn_group');
		new_item.setAttribute('id', 'route_btn_group');
		new_item.classList.add(...Array.from(old_item.classList));
		new_item.children.item(0).classList.add('text-nowrap');
		old_item.replaceWith(new_item);
		let hash_from_param = (new URL(document.location)).searchParams.get('_escaped_fragment_');
		if(window.location.hash || hash_from_param){
			handle_page_change();
		}
	});


}

function check_metadata(){
	return fetch('data/metadata.json')
	.then(response => response.json())
	.then(metadata => {
		if((localStorage.app_version == metadata.app_version || localStorage.retrieval_date == metadata.retrieval_date) && typeof data != 'undefined') {
			return;
		}
		localStorage.app_version = metadata.app_version;
		localStorage.retrieval_date = metadata.retrieval_date;
		return fetch_data(metadata);
	})
	.then(() => {
		update_versions();
	});
}

function update_versions(){
	document.querySelector('#last_data_update').innerText = format_date_string(localStorage.retrieval_date);
	document.querySelector('#app_version').innerText = format_date_string(localStorage.app_version);
}

function fetch_data(metadata=false){
	console.time('Fetching data');
	let promises = [];

	promises.push(fetch('data/stops.json')
	.then(response => response.json())
	.then(stops => {
		localStorage.stops_hash = metadata.hashes.stops;
		return stops;
	}));
	promises.push(fetch('data/directions.json')
	.then(response => response.json())
	.then(directions => {
		localStorage.directions_hash = metadata.hashes.directions;
		return directions;
	}));
	promises.push(fetch('data/routes.json')
	.then(response => response.json())
	.then(routes => {
		localStorage.routes_hash = metadata.hashes.routes;
		return routes;
	}));
	promises.push(fetch('data/trips.json')
	.then(response => response.json())
	.then(trips => {
		localStorage.trips_hash = metadata.hashes.trips;
		return trips;
	}));
	promises.push(fetch('data/stop_times.json')
	.then(response => response.json())
	.then(stop_times => {
		localStorage.stop_times_hash = metadata.hashes.stop_times;
		return stop_times;
	}));
	return Promise.all(promises)
	.then((response)=>{
		console.timeEnd('Fetching data');
		console.time('Starting init');
		let organised_data = {
			stops: response[0],
			directions: response[1],
			routes: response[2],
			trips: response[3],
			stop_times: response[4]
		};
		console.time('Init schedules data');
		init_schedules_data(organised_data);
		console.timeEnd('Init schedules data');
		console.time('Init favourites data');
		init_favourites();
		console.timeEnd('Init favourites data');
		console.time('Init schedules');
		init_schedules();
		console.timeEnd('Init schedules');
		console.time('Init virtual boards');
		init_virtual_boards();
		console.timeEnd('Init virtual boards');
		console.time('Init stops');
		filter_stops();
		console.timeEnd('Init stops');
		document.body.classList.remove('no-scroll');
		console.timeEnd('Starting init');

		update_network_status();
	})
	.then(() => {
		document.querySelector('.loading_screen').classList.add('d-none');
		document.querySelector('#main_app').classList.remove('d-none');
	})
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
	.catch((err) => console.error('Service worker registration FAIL:', err));
}
init();

function drop_current() {
	current = {};
}