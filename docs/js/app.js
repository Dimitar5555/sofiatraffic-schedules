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
		let new_item = generate_btn_group({stop_code:1, buttons: ['departures_board', 'schedule'], text: true});
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

is_map_done = false;
async function init_map() {
	if(is_map_done) {
		show_favourite_stops();
		filter_stops(document.querySelector('[name="search_for_stop"]').value);
		return;
	}
	is_map_done = true;
	let icon = new L.Icon({
		iconUrl: 'images/marker-icon.png',
		iconSize: [25, 41],
		iconAnchor: [12, 41],
		popupAnchor: [1, -34]
	});
	document.querySelector('a[data-bs-target="#stops_map"]').setAttribute('onclick', 'manual_push_state(this.href)');
	map = L.map('map', {
		center: [42.69671, 23.32129],
		zoom: 13
	});
	map.invalidateSize();
	const attribution_text = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: attribution_text}).addTo(map);

	cluster_group = new L.markerClusterGroup({
		disableClusteringAtZoom: 16,
		showCoverageOnHover: false
	}).addTo(map);


	function generate_popup_text(stop, route_indexes) {
		let popup = html_comp('div', {class: 'text-center'});
		let p1 = html_comp('p', {class: 'my-1 fs-6 mb-1', text: get_stop_string(stop)})
		let p2 = html_comp('p', {class: 'my-1 fs-6'});
		generate_routes_thumbs(route_indexes, p2);
		popup.appendChild(p1);
		popup.appendChild(p2);
		popup.appendChild(generate_btn_group({buttons: ['departures_board', 'schedule'], stop_code: stop.code, text: true}));
		return popup;
	}
	let markers = [];
	console.time('Adding stops to map');
	for(let stop of data.stops) {
		let popup = generate_popup_text(stop, stop.route_indexes);
		let marker = L.marker(stop.coords, {icon: icon})
		.bindPopup(popup, {maxWidth: 340, closeButton: false});
		stop.marker = marker;
		stop.is_marker_shown = true;
		markers.push(marker);
	}
	cluster_group.addLayers(markers);
	map.fitBounds(cluster_group.getBounds());
	console.timeEnd('Adding stops to map');
	show_favourite_stops();
}

async function init_stops_list() {
	const stops_list = document.querySelector('#stops_list');
	let curently_shown_stops = 0;
	for(let stop of data.stops) {
		let stop_row = generate_stop_row(stop);
		curently_shown_stops++;
		if(curently_shown_stops > maximum_stops_shown_at_once) {
			stop_row.classList.add('d-none');
		}
		stops_list.appendChild(stop_row);
	}
}

async function toggle_stop_type_visibility() {
	let to_remove = [];
	let to_add = [];

	const metro = document.querySelector('#metro_stops_visibility').checked;
	const tram = document.querySelector('#tram_stops_visibility').checked;
	const trolley = document.querySelector('#trolley_stops_visibility').checked;
	const bus = document.querySelector('#bus_stops_visibility').checked;

	const show_types = new Set();
	if(metro) show_types.add(main_types.metro);
	if(tram) show_types.add(main_types.tram);
	if(trolley) show_types.add(main_types.trolley);
	if(bus) show_types.add(main_types.bus);
	console.time('Filtering stops');
	data.stops.forEach(stop => {
		// const route_types = new Set();
		// stop.route_indexes.map(index => route_types.add(data.routes[index].type));

		if(show_types.intersection(stop.route_types).size > 0) {
			if(!stop.is_marker_shown) {
				to_add.push(stop.marker);
				stop.is_marker_shown = true;
			}
		}
		else {
			if(stop.is_marker_shown) {
				to_remove.push(stop.marker);
				stop.is_marker_shown = false;
			}
		}
	});
	cluster_group.removeLayers(to_remove);
	cluster_group.addLayers(to_add, {chunkedLoading: true});
}

function check_metadata(){
	return fetch('data/metadata.json')
	.then(response => response.json())
	.then(metadata => {
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
	var promises = [];

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
		let organised_data = {
			stops: response[0],
			directions: response[1],
			routes: response[2],
			trips: response[3],
			stop_times: response[4]
		};
		init_schedules_data(organised_data);
		init_favourites();
		init_schedules();
		init_virtual_boards();
		init_stops_list();
	})
	.then(() => {
		document.body.classList.remove('no-scroll');
		document.querySelector('.loading_screen').classList.add('d-none');
	});
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