import "leaflet";
import "leaflet.markercluster";
import "leaflet.featuregroup.subgroup";
import { LocateControl} from "leaflet.locatecontrol";
import { Tooltip } from "bootstrap";

import { main_types, data } from "./app";
import { generate_routes_thumbs } from "./schedules";
import { STOP_BTN_TYPES } from "./config";
import { is_online, generate_btn_group, html_comp, get_stop_string, is_metro_stop } from "./utilities";

window.toggle_stop_type_visibility = async function() {
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

var is_map_initialised = false;
var was_map_centered = false;
var cluster_group;
window.init_map = function() {
	filter_stops();
	if(is_map_initialised || !is_online()) {
		center_map();
		return;
	}
	is_map_initialised = true;
	let icon = new L.Icon({
		iconUrl: new URL('../../node_modules/leaflet/dist/images/marker-icon.png', import.meta.url).href,
		iconSize: [25, 41],
		iconAnchor: [12, 41],
		popupAnchor: [1, -34],
	})
	icon.options.shadowSize = [0, 0];
	
	// document.querySelector('a[data-bs-target="#stops_map"]').setAttribute('onclick', 'manual_push_state(this.href)');
	window.map = L.map('map', {
		center: [42.69671, 23.32129],
		zoom: 13
	});
	const attribution_text = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: attribution_text}).addTo(map);

	cluster_group = new L.markerClusterGroup({
		disableClusteringAtZoom: 16,
		showCoverageOnHover: false
	}).addTo(map);

	function generate_popup_text(stop, route_indexes) {
		const popup = html_comp('div', {class: 'text-center'});
		const p1 = html_comp('p', {class: 'my-1 fs-6 mb-1', text: get_stop_string(stop)})
		const p2 = html_comp('p', {class: 'mt-2 mb-3 fs-6 lh-lg'});
		generate_routes_thumbs(route_indexes, p2);
		popup.appendChild(p1);
		popup.appendChild(p2);
		popup.appendChild(generate_btn_group(stop.code, [STOP_BTN_TYPES.departures_board, STOP_BTN_TYPES.schedule], true));
		popup.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(tooltipEl => {
			new Tooltip(tooltipEl, { trigger: 'hover' });
		});
		return popup;
	}
	let markers = [];
	console.time('Adding stops to map');
	const metro_icon = new L.Icon({
		iconUrl: new URL('../images/marker-icon-metro.png', import.meta.url).href,
		iconSize: [30, 30],
		iconAnchor: [15, 15],
		popupAnchor: [1, -16]
	});
	for(const stop of data.stops) {
		const marker = L.marker(stop.coords, {icon: icon});
		marker.bindPopup(() => generate_popup_text(stop, stop.route_indexes), {maxWidth: 340, closeButton: false});
		if(is_metro_stop(stop.code)) {
			marker.setIcon(metro_icon);
		}
		stop.marker = marker;
		stop.is_marker_shown = true;
		markers.push(marker);
	}
	cluster_group.addLayers(markers);
	console.timeEnd('Adding stops to map');

	center_map();
	new LocateControl().addTo(map);
}

window.addEventListener('online', update_network_status);
window.addEventListener('offline', update_network_status);

export function update_network_status() {
	const is_online_bool = is_online();
    const status = is_online_bool ? 'online' : 'offline';
    console.warn(`Network status changed: ${status}`);

	const map_col = document.querySelector('#map').parentElement;
	const map_warning_col = map_col.nextElementSibling;

    map_col.classList.toggle('d-none', !is_online_bool);
	map_warning_col.classList.toggle('d-none', is_online_bool);

	filter_stops();
	init_map();
}

function center_map() {
	setTimeout(() => {
		const map_el = document.querySelector('#map');
		const is_map_visible = map_el.checkVisibility();
		if(is_map_initialised && !was_map_centered && is_map_visible) {
			was_map_centered = true;
			map.invalidateSize();
			const bounds = cluster_group.getBounds();
			map.fitBounds(bounds);
		}
	}, 50);
}