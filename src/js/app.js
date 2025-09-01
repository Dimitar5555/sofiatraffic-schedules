import "bootstrap";
// import "bootstrap-icons";

import { Tab } from "bootstrap";

import { STOP_BTN_TYPES } from './config';
import { update_network_status} from './map';
import './virtual_boards';
import './utilities';
import { handle_page_change} from './navigation';
import { init_schedules_data, format_time, init_schedules, init_virtual_boards } from './schedules';
import { init_favourites } from './favourites';
import { format_date_string, html_comp, generate_btn_group, get_split_hash } from './utilities';

const schedule_div = document.querySelector('#schedules');
const schedule_display_div = document.querySelector('#schedule_display');
const line_selector_div = document.querySelector('#line_selector');
const stop_schedule_div = document.querySelector('#stop_schedule');

export const divs = {
	schedule_div,
	schedule_display_div,
	line_selector_div,
	stop_schedule_div
};

const allowed_languages = ['bg'];
export const main_types = {
	metro: 'metro',
	tram: 'tram',
	trolley: 'trolley',
	bus: 'bus'
};
export const main_types_order = [
	main_types.metro, 
	main_types.tram, 
	main_types.trolley,
	main_types.bus];
export const sec_types = ['temporary', 'school', 'night'];

export const tab_btns = Array.from(document.querySelector('nav').children).map(btn => new Tab(btn));

export const maximum_stops_shown_at_once = 6;

window.current = {
	route: null, trip: null, stop_code: null, view: null
};

export var lang = {};

function init(debug=false) {
	if(!localStorage.getItem('lang')) {
		const cur_lang = navigator.languages.map(lang => lang.split('-')[0]).find(lang => allowed_languages.includes(lang));
		localStorage.setItem('lang', cur_lang ? cur_lang : 'bg');
	}

	if(!localStorage.getItem('favourite_stops')) {
		localStorage.setItem('favourite_stops', '[]');
	}

	if(!localStorage.getItem('favourite_lines')) {
		localStorage.setItem('favourite_lines', '[]');
	}

	fetch(`i18n/${localStorage.getItem('lang')}.json`)
	.then(response => response.json())
	.then(response => {
        lang = response;
	    
		function show_string(el, key='innerText') {
			const i18n_key = key != 'innerText' ? `data-i18n-${key}` : 'data-i18n';
			const full_path = el.getAttribute(i18n_key);
			try {
				const string = response[full_path];
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
		if(get_split_hash().length != 0) {
			handle_page_change();
		}
	});
}

function check_metadata() {
	console.log('Checking metadata');
	const theme = localStorage.getItem('theme') || 'auto';
	document.querySelector(`#settings_${theme}_theme`).checked = true;
	change_theme(theme);

	return fetch('data/metadata.json')
	.then(response => response.json())
	.then(metadata => {
		if((localStorage.app_version == metadata.app_version || localStorage.retrieval_date == metadata.retrieval_date) && typeof data != 'undefined') {
			// return;
		}
		localStorage.app_version = metadata.app_version;
		localStorage.retrieval_date = metadata.retrieval_date;
		console.log('Calling fetch_data');
		return fetch_data(metadata);
	})
	.then(() => {
		update_versions();
	});
}

function update_versions(){
	document.querySelector('#last_data_update').innerText = format_date_string(localStorage.retrieval_date);
}

export var data = {};

function fetch_data(metadata=false){
	console.log('Fetching data');
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
		data = organised_data;
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
		document.querySelector('main').classList.remove('d-none');
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
	try {
		navigator.serviceWorker.register(new URL('/src/sw.js', import.meta.url), { type: 'module' })
	} catch (err) {
		const span = document.querySelector('#error_msg');
		span.previousElementSibling.previousElementSibling.classList.remove('d-none');
		span.previousElementSibling.previousElementSibling.previousElementSibling.classList.add('d-none');
		span.innerText = err;
	}
}
init();

window.drop_current = function() {
	current = {};
}

function change_theme(new_theme) {
	const html_el = document.querySelector('html');
	localStorage.setItem('theme', new_theme);
	if(new_theme == 'auto') {
		if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
			new_theme = 'dark';
		}
		else {
			new_theme = 'light';
		}
	}
	html_el.setAttribute('data-bs-theme', new_theme);

	const loading_screen = document.querySelector('.loading_screen');
	loading_screen.classList.toggle('bg-dark', new_theme == 'dark');
	loading_screen.classList.toggle('bg-white', new_theme == 'light');
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
	const currently_selected = localStorage.getItem('theme') || 'auto';
	if(currently_selected == 'auto') {
		change_theme(currently_selected);
		return;
	}
});

function get_metro_mappings() {
	const mappings = [
		{ old_code: 2975, new_code: 212 },
		{ old_code: 2976, new_code: 212 },
		{ old_code: 2977, new_code: 211 },
		{ old_code: 2978, new_code: 211 },
		{ old_code: 2979, new_code: 210 },
		{ old_code: 2980, new_code: 210 },
		{ old_code: 2981, new_code: 209 },
		{ old_code: 2982, new_code: 209 },
		{ old_code: 2983, new_code: 208 },
		{ old_code: 2984, new_code: 208 },
		{ old_code: 2985, new_code: 207 },
		{ old_code: 2986, new_code: 207 },
		{ old_code: 2987, new_code: 206 },
		{ old_code: 2988, new_code: 206 },
		{ old_code: 2989, new_code: 205 },
		{ old_code: 2990, new_code: 205 },
		{ old_code: 2991, new_code: 204 },
		{ old_code: 2992, new_code: 204 },
		{ old_code: 2993, new_code: 203 },
		{ old_code: 2994, new_code: 203 },
		{ old_code: 2995, new_code: 202 },
		{ old_code: 2996, new_code: 202 },
		{ old_code: 2997, new_code: 201 },
		{ old_code: 2998, new_code: 201 },
		{ old_code: 2999, new_code: 0 },
		{ old_code: 3000, new_code: 0 },
	
		// M1
		{ old_code: 3001, new_code: 1 },
		{ old_code: 3002, new_code: 1 },
		{ old_code: 3003, new_code: 2 },
		{ old_code: 3004, new_code: 2 },
		{ old_code: 3005, new_code: 3 },
		{ old_code: 3006, new_code: 3 },
		{ old_code: 3007, new_code: 4 },
		{ old_code: 3008, new_code: 4 },
		{ old_code: 3009, new_code: 5 },
		{ old_code: 3010, new_code: 5 },
		{ old_code: 3011, new_code: 6 },
		{ old_code: 3012, new_code: 6 },
		{ old_code: 3013, new_code: 7 },
		{ old_code: 3014, new_code: 7 },
		{ old_code: 3015, new_code: 8 },
		{ old_code: 3016, new_code: 8 },
		{ old_code: 3017, new_code: 9 },
		{ old_code: 3018, new_code: 9 },
		{ old_code: 3019, new_code: 10 },
		{ old_code: 3020, new_code: 10 },
		{ old_code: 3021, new_code: 11 },
		{ old_code: 3022, new_code: 11 },
		{ old_code: 3023, new_code: 12 },
		{ old_code: 3024, new_code: 12 },
		{ old_code: 3025, new_code: 13 },
		{ old_code: 3026, new_code: 13 },
	
		// Branch towards Sofia Airport
		{ old_code: 3027, new_code: 18 },
		{ old_code: 3028, new_code: 18 },
		{ old_code: 3029, new_code: 19 },
		{ old_code: 3030, new_code: 19 },
		{ old_code: 3031, new_code: 20 },
		{ old_code: 3032, new_code: 20 },
		{ old_code: 3033, new_code: 21 },
		{ old_code: 3034, new_code: 21 },
		{ old_code: 3035, new_code: 22 },
		{ old_code: 3036, new_code: 22 },
		{ old_code: 3037, new_code: 23 },
		{ old_code: 3038, new_code: 23 },
	
		// Branch towards Business Park
		{ old_code: 3039, new_code: 14 },
		{ old_code: 3040, new_code: 14 },
		{ old_code: 3041, new_code: 15 },
		{ old_code: 3042, new_code: 15 },
		{ old_code: 3043, new_code: 16 },
		{ old_code: 3044, new_code: 16 },
	
		// M3 Hadzi Dimitar => Gorna Banya
		{ old_code: 3309, new_code: 305 },
		{ old_code: 3310, new_code: 305 },
		{ old_code: 3311, new_code: 306 },
		{ old_code: 3312, new_code: 306 },
		{ old_code: 3315, new_code: 308 },
		{ old_code: 3316, new_code: 308 },
		{ old_code: 3317, new_code: 309 },
		{ old_code: 3318, new_code: 309 },
		{ old_code: 3319, new_code: 310 },
		{ old_code: 3320, new_code: 310 },
		{ old_code: 3321, new_code: 311 },
		{ old_code: 3322, new_code: 311 },
		{ old_code: 3323, new_code: 312 },
		{ old_code: 3324, new_code: 312 },
		{ old_code: 3327, new_code: 314 },
		{ old_code: 3328, new_code: 314 },
		{ old_code: 3329, new_code: 315 },
		{ old_code: 3330, new_code: 315 },
		{ old_code: 3331, new_code: 316 },
		{ old_code: 3332, new_code: 316 },
		{ old_code: 3333, new_code: 317 },
		{ old_code: 3334, new_code: 317 },
		{ old_code: 3335, new_code: 318 },
		{ old_code: 3336, new_code: 318 }
	];
	return mappings;
}

export function get_old_code_from_new_code(new_code) {
	const mappings = get_metro_mappings();
	const mapping = mappings.find(mapping => mapping.new_code == new_code);
	return mapping.old_code;
}

export function get_new_code_from_old_code(old_code) {
	const mappings = get_metro_mappings();
	const mapping = mappings.find(mapping => mapping.old_code == old_code);
	return mapping.new_code;
}