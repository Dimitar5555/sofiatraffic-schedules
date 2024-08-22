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

const maximum_stops_shwon_at_once = 6;

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
	.then((response) => {
        lang = response;
	    
        const i18n_els = document.querySelectorAll('[data-i18n]');
        Array.from(i18n_els)
        .map(el => {
			try {
				var path = el.dataset.i18n.split('.');
				var string = path.reduce((acc, cur) => acc[cur], response);
				if(!string){
					alert(el.dataset.i18n);
				}
				el.innerHTML = debug?`{{${el.dataset.i18n}}}`:string;
			}
			catch(err) {
				console.error(`Missing string: ${el.dataset.i18n}`)
			}
        });
	});

	
	check_metadata()
	.then(() => {
		let new_item = generate_stop_action_buttons(1);
		let old_item = document.querySelector('#route_btn_group');
		new_item.setAttribute('id', 'route_btn_group');
		new_item.classList.add(...Array.from(old_item.classList));
		new_item.children.item(0).classList.add('text-nowrap');
		old_item.replaceWith(new_item);
		if(window.location.hash){
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
	document.querySelector('[name="search_for_stop"]').setAttribute('placeholder', lang.actions.search_by_name_or_code);
	let icon = new L.Icon({
		iconUrl: 'images/marker-icon.png',
		iconSize: [25, 41],
		iconAnchor: [12, 41],
		popupAnchor: [1, -34]
	});
	icon.options.shadowSize = [0,0];
	let start = Date.now();
	document.querySelector('a[data-bs-target="#stops_map"]').setAttribute('onclick', 'manual_push_state(this.href)');
	map = L.map('map', {
		center: [42.69671, 23.32129],
		zoom: 13
	});
	map.invalidateSize();
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png?{foo}', {foo: 'bar', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);

	var marker_groups = {
		metro: [],
		tram: [],
		trolley: [],
		bus: []
	};

	var cluster_group = new L.markerClusterGroup({
		disableClusteringAtZoom: 16,
		showCoverageOnHover: false
	}).addTo(map);


	function generate_popup_text(stop, routes) {
		let popup = html_comp('div', {class: 'text-center'});
		let p1 = html_comp('p', {class: 'my-1 fs-6 mb-1', text: get_stop_string(stop)})
		let p2 = html_comp('p', {class: 'my-1 fs-6'});
		generate_routes_thumbs(routes, p2);
		popup.appendChild(p1);
		popup.appendChild(p2);
		popup.appendChild(generate_stop_action_buttons(stop.code));
		return popup;
	}
	const stops_list = document.querySelector('#stops_list');
	let curently_shown_stops = 0;
	for(let stop of data.stops) {
		stops_list.appendChild(generate_stop_row(stop));
		curently_shown_stops++;
		if(curently_shown_stops>maximum_stops_shwon_at_once) {
			stops_list.children.item(curently_shown_stops-1).classList.add('d-none');
		}
		let stop_routes = stop.route_indexes.map(index => data.routes[index]);
		let popup = generate_popup_text(stop, stop_routes);
		let marker = L.marker(stop.coords, {icon: icon})
		.bindPopup(popup, {maxWidth: 340, closeButton: false});
		stop.marker = marker;
		let route_types = stop_routes.map(route => route.type);
		if(route_types.includes(main_types.metro)){
			marker_groups.metro.push(marker);
		}
		else {
			if(route_types.includes(main_types.tram)){
				marker_groups.tram.push(marker);
			}
			if(route_types.includes(main_types.trolley)){
				marker_groups.trolley.push(marker);
			}
			if(route_types.includes(main_types.bus)){
				marker_groups.bus.push(marker);
			}
		}
	}
	// generate sub groups for marker cluster
	let stop_dir_matching = Date.now();
	let metro_sub = L.featureGroup.subGroup(cluster_group, marker_groups.metro).addTo(map);
	let tram_sub = L.featureGroup.subGroup(cluster_group, marker_groups.tram).addTo(map);
	let trolley_sub = L.featureGroup.subGroup(cluster_group, marker_groups.trolley).addTo(map);
	let bus_sub = L.featureGroup.subGroup(cluster_group, marker_groups.bus).addTo(map);
	console.log(`Matching time ${Date.now()-stop_dir_matching} ms`, marker_groups.bus.length);
	
	map.fitBounds(cluster_group.getBounds());

	var overlays = {
		"Метростанции": metro_sub,
		"Трамвайни спирки": tram_sub,
		"Тролейбусни спирки": trolley_sub,
		"Автобусни спирки": bus_sub
	};
	L.control.layers([], overlays, {collapsed: true}).addTo(map);
	console.log(`Took ${Date.now()-start} ms to generate map`);
	show_favourite_stops();
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
	.catch((err) => alert('Service worker registration FAIL:', err));
}
init();

function drop_current() {
	current = {};
}