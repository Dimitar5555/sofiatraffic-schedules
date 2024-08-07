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

current = {
	route: null, trip: null, stop_code: null, view: null
};

function update_page_title(hash) {
	if(!hash) {
		hash = window.location.hash;
	}
	let title_el = document.querySelector('title');
	if(hash.includes('#schedules')) {
		title_el.innerText = lang.titles.title;
	}
	else if(hash.includes('#favourite_stops')) {
		title_el.innerText = `${lang.titles.favourite_stops} - ${lang.titles.short_title}`;
	}
	else if(hash.includes('#stops_map')) {
		title_el.innerText = `${lang.titles.stops_map} - ${lang.titles.short_title}`;
	}
	else if(main_types_order.some(main_type => hash.includes(main_type))) {
		let split_hash = hash.replace('#', '').split('/');
		let line_type = split_hash[0];
		let line_ref = split_hash[1];
		title_el.innerText = `${lang.titles.schedule_of} ${lang.line_type[line_type].toLowerCase()} ${line_ref} - ${lang.titles.short_title}`
	}
	else if(hash.includes('#stop')) {
		let split_hash = hash.replace('#', '').split('/');
		let stop_code = split_hash[1];
		title_el.innerText = `${lang.titles.schedule_of} спирка ${get_stop_string(stop_code)} - ${lang.titles.short_title}`
	}
}

function updateURL(page=false){
	let new_hash = '';
	if(page){
		new_hash = page;
	}
	else if(current.view=='route'){
		var is_weekend_val = document.querySelector('[name=route_schedule_type]:checked').value;
		new_hash = `#${current.route.type}/${current.route.line}/${return_weekday_text(is_weekend_val)}/${current.trip.direction}/${current.stop_code}/`;
	}
	else if(current.view=='stop'){
		var is_weekend_val = document.querySelector('[name=stop_schedule_type]:checked').value;
		new_hash = `#stop/${format_stop_code(current.stop_code)}/${return_weekday_text(is_weekend_val)}/`;
	}
	if(window.location.hash==new_hash){
		return;
	}
	console.log('called updateURL: '+window.location.hash+' '+new_hash);
	history.pushState({}, '', new_hash);
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
			try {
				var path = el.dataset.i18n.split('.');
				var string = path.reduce((acc, cur) => acc[cur], response);
				if(!string){
					alert(el.dataset.i18n);
				}
				el.innerHTML = debug?`{{${el.dataset.i18n}}}`:string;
			}
			catch(err) {
				alert(el.dataset.i18n)
			}
        });
	});

	
	check_metadata()
	.then(() => {
		let new_item = generate_schedule_departure_board_buttons(1);
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

function init_map() {
	let start = Date.now();
	document.querySelector('a[data-bs-target="#stops_map"]').setAttribute('onclick', 'history.pushState({}, \'\', this.href)');
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
		let popup = html_comp('div');
		let p1 = html_comp('p', {class: 'my-1 fs-6 mb-1 text-center', text: get_stop_string(stop)})
		let p2 = html_comp('p', {class: 'my-1 fs-6 text-center'});
		routes.map(route => {
			p2.appendChild(html_comp('span', {class: get_route_colour_classes(route), text: route.line}))
			p2.appendChild(document.createTextNode(' '));
		});
		popup.appendChild(p1);
		popup.appendChild(p2);
		popup.appendChild(generate_schedule_departure_board_buttons(stop.code));
		return popup;
	}

	data.stops.forEach(stop => {
		let stop_directions = stop.direction_codes;
		let routes = data.routes.filter(route => route.direction_codes.some(route_dir_code => stop_directions.includes(route_dir_code)));
		let popup = generate_popup_text(stop, routes);
		let marker = L.marker(stop.coords)
		.bindPopup(popup);
		let route_types = new Set(routes.map(route => route.type));
		if(route_types.has(main_types.metro)){
			marker_groups.metro.push(marker);
		}
		if(route_types.has(main_types.tram)){
			marker_groups.tram.push(marker);
		}
		if(route_types.has(main_types.trolley)){
			marker_groups.trolley.push(marker);
		}
		if(route_types.has(main_types.bus)){
			marker_groups.bus.push(marker);
		}
	});

	// generate sub groups for marker cluster
	let metro_sub = L.featureGroup.subGroup(cluster_group, marker_groups.metro).addTo(map);
	let tram_sub = L.featureGroup.subGroup(cluster_group, marker_groups.tram).addTo(map);
	let trolley_sub = L.featureGroup.subGroup(cluster_group, marker_groups.trolley).addTo(map);
	let bus_sub = L.featureGroup.subGroup(cluster_group, marker_groups.bus).addTo(map);
	
	map.fitBounds(cluster_group.getBounds());

	var overlays = {
		"Метростанции": metro_sub,
		"Трамвайни спирки": tram_sub,
		"Тролейбусни спирки": trolley_sub,
		"Автобусни спирки": bus_sub
	};
	L.control.layers([], overlays, {collapsed: true}).addTo(map);
	console.log(`Took ${Date.now()-start} ms to generate map`);
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
	})
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
		init_schedules();
		init_favourites();
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

window.addEventListener('popstate', function(event) {
	handle_page_change();
});

window.addEventListener('pushstate', function(event) {
	handle_page_change();
});

function handle_page_change() {
	let hash = decodeURIComponent(window.location.hash).replace('#', '').split('/');
	let main_tab_index = ['schedules', 'favourite_stops', 'stops_map'].indexOf(hash[0]);
	let globals = get_globals_from_hash(hash);
	console.log('detected globals', globals);
	if(globals.is_stop || globals.is_route) {
		update_globals(globals);
		show_schedule(globals, false, hash.length != 3);
	}
	else if(main_tab_index != -1) {
		tab_btns[main_tab_index].show();
		if(hash[0] == 'stops_map') {
			init_map();
		}
	}
	update_page_title();
}

function get_globals_from_hash(hash) {
	let globals = {};
	if(main_types[hash[0]]){
		var type = hash[0];
		var line = hash[1];
		var route_index = data.routes.findIndex(route => route.type==type && route.line==line);

		globals.is_route = true;
		globals.route = data.routes[route_index];
		globals.is_weekend = is_weekend(hash[2]);
		globals.direction = hash[3];
		globals.stop_code = hash[4];
		globals.view = 'route';

		if(route_index==-1 /*|| !data.directions.find(dir => dir.code==loc_data.direction) || !data.stops.find(stop => stop.code==loc_data.stop_code)*/){
			return;
		}
	}
	else if(hash[0]=='stop') {
		globals.stop_code = parseInt(hash[1]);
		globals.schedule_type = {workday: 0, weekend: 1}[hash[2]];
		globals.is_stop = true;
		globals.view = 'stop';
		console.log(hash[2])
	}
	return globals;
}

function navigate_to_home() {
	if(current.view == 'stop') {
		line_selector_div.classList.add('d-none');
		stop_schedule_div.classList.remove('d-none');
		schedule_display.classList.add('d-none');
		history.pushState({}, '', generate_current_hash());
		
	}
	else if(current.view == 'route') {
		line_selector_div.classList.add('d-none');
		stop_schedule_div.classList.add('d-none');
		schedule_display.classList.remove('d-none');
		history.pushState({}, '', generate_current_hash());
	}
	else{
		line_selector_div.classList.remove('d-none');
		stop_schedule_div.classList.add('d-none');
		schedule_display.classList.add('d-none');
		history.pushState({}, '', '#schedules');
	}
}

function drop_current() {
	current = {};
}

function generate_current_hash() {
	if(current.view == 'stop') {
		return `#stop/${current.stop_code}/`;
	}
	else if(current.view == 'route') {
		return `#${current.route.type}/${current.route.line}/`;
	}		
}