const schedule_div = document.querySelector('#schedule');
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
	route: null, trip: null, stop_code: null
};

function updateURL(page=false){
	console.log('called updateURL: '+page);
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
			navigate_to_current_hash(true);
		}
	});
}
function init_map(){
	document.querySelector('a[data-bs-target="#stops_map"]').setAttribute('onclick', 'updateURL(this.href);');
	map = L.map('map', {
		center: [51.505, -0.09],
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

	data.stops.forEach(stop => {
		let directions = stop.direction_codes;
		let routes = data.routes.filter(route => route.direction_codes.some(route_dir_code => directions.includes(route_dir_code)));
		let popup_text = `
		<p class="my-1 fs-6 mb-1 text-center">${get_stop_string(stop)}]</p>
		<p class="my-1 fs-6 text-center">${routes.map(route => `<span class="${get_route_colour_classes(route)}">${route.line}</span>`).join(' ')}</p>
		${generate_schedule_departure_board_buttons(stop.code).outerHTML}
		`;
		let marker = L.marker(stop.coords)
		.bindPopup(popup_text);
		let route_types = routes.map(route => route.type);
		if(route_types.includes(main_types.metro)){
			marker_groups.metro.push(marker);
		}
		if(route_types.includes(main_types.tram)){
			marker_groups.tram.push(marker);
		}
		if(route_types.includes(main_types.trolley)){
			marker_groups.trolley.push(marker);
		}
		if(route_types.includes(main_types.bus)){
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

function navigate_to_current_hash(first_entry=false) {
	var hash = decodeURIComponent(window.location.hash).replace('#', '').split('/');
	var main_tab_index = ['schedule', 'favourite_stops', 'stops_map'].indexOf(hash[0]);
	if(main_tab_index!=-1){
		tab_btns[main_tab_index].show();
		if(hash[0]=='stops_map' && map.parentElement){
			init_map();
		}
	}
	else if(main_types[hash[0]]){
		var type = hash[0];
		var line = hash[1];
		var route_index = data.routes.findIndex(route => route.type==type && route.line==line);
		var loc_data = {
			is_route: true,
			route: data.routes[route_index],
			is_weekend: hash[2]=='weekend',
			direction: hash[3],
			stop_code: hash[4]
		};
		if(route_index==-1 /*|| !data.directions.find(dir => dir.code==loc_data.direction) || !data.stops.find(stop => stop.code==loc_data.stop_code)*/){
			return;
		}
		update_globals(loc_data);
		show_schedule(loc_data, true);
		if(route_index != -1 && first_entry){
			updateURL();
		}
	}
	else if(hash[0]=='stop'){
		show_schedule({stop_code: Number(hash[1]), schedule_type: {weekday: '100', saturday: '010', sunday: '001'}[hash[2]], is_stop: true});
	}
}
window.addEventListener('popstate', function(event) {
	navigate_to_current_hash();

});
window.addEventListener('pushstate', function(event) {
	navigate_to_current_hash();
});