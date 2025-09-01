import { parse_time, fetch_data_from_sofiatraffic } from "./build_utilities.js";
import { routes_url, schedule_url, main_types } from "./config.js";
import { normalise_route } from 'sofiatraffic-library'

function format_stop_code(stop_code) {
	return stop_code.toString().padStart(4, '0');
}

function normalise_metro_stop_codes(start_code, end_code) {
	const bindings = {
		// M1 => Slivnitsa
		'0016->0001': [
			3044, 3042, 3040, 3026, 3024, 3022, 3020, 3018, 3016, 3014, 3012, 3010, 3008, 3006, 3004, 3002
		],
		// M1 => Business Park Sofia
		'0001->0016': [
			3001, 3003, 3005, 3007, 3009, 3011, 3013, 3015, 3017, 3019, 3021, 3023, 3025, 3039, 3041, 3043
		],
		// '0000->0001': [
			// 3000, 2998, 2996, 2994, 2992, 2990, 2988, 2986, 2984, 2982, 2980, 2978, 2976
		// ],
		// M2 => Obelya (start/end trips reach Slivnitsa)
		'0212->0000': [
			2975, 2977, 2979, 2981, 2983, 2985, 2987, 2989, 2991, 2993, 2995, 2997, 2999
		],
		// M2 => Vitosha
		'0000->0212': [
			3000, 2998, 2996, 2994, 2992, 2990, 2988, 2986, 2984, 2982, 2980, 2978, 2976
		],
		// M3 => Gorna banya
		// 3313 is a station between Orlov most and Teatralna, which wasn't built
		// 3325 is a station between Krasno selo and Bulgaria Blvd., which wasn't built
		'0305->0318': [
			3309, 3311, /*3313,*/ 3315, 3317, 3319, 3321, 3323, /*3325,*/ 3327, 3329, 3331, 3333, 3335
		],
		// M3 => Hadzhi Dimitar
		// 3314 is a station between Orlov most and Teatralna, which wasn't built
		// 3326 is a station between Krasno selo and Bulgaria Blvd., which wasn't built
		'0318->0305': [
			3336, 3334, 3332, 3330, 3328, /*3326,*/ 3324, 3322, 3320, 3318, 3316, /*3314,*/ 3312, 3310
		],
		// M4 => Slivnitsa
		'0023->0001': [
			3038, 3036, 3034, 3032, 3030, 3028, 3026, 3024, 3022, 3020, 3018, 3016, 3014, 3012, 3010, 3008, 3006, 3004, 3002
		],
		// M4 => Sofia Airport
		'0001->0023': [
			3001, 3003, 3005, 3007, 3009, 3011, 3013, 3015, 3017, 3019, 3021, 3023, 3025, 3027, 3029, 3031, 3033, 3035, 3037
		]
	};
	let key = `${format_stop_code(start_code)}->${format_stop_code(end_code)}`;
	return bindings[key];
}

function fetch_routes_data() {
	let routes = fetch_data_from_sofiatraffic(routes_url)
	.then(response => response.json())
	.catch(error => {
		console.error('Failed to fetch routes data', error);
		return [];
	});
	return routes;
}

function determine_route_type(route, type_string) {
	if(type_string.includes('subway.png')){
		route.type = 'metro';
	}
	else if(type_string.includes('tram.png')){
		route.type = 'tram';
	}
	else if(type_string.includes('trolley.png')){
		route.type = 'trolley';
	}
	else if(type_string.includes('bus.png')){
		route.type = 'bus';
	}
	else{
		console.error(`Unrecognised line type: ${type_string}`);
	}
	const route_ref = route.route_ref;
	if(normalise_route(route)) {
		return;
	}
	/*   Cyrrilic                     Latin */
	if(route_ref.includes('Т') || route_ref.includes('T')) {
		route.type = 'bus';
		route.subtype = 'temporary';
	}
	else if(route_ref.startsWith('N')) {
		route.subtype = 'night';
	}
	else if(route_ref.startsWith('У')) {
		route.subtype = 'school';
	}
}
function determine_route_ref(ref) {
	const number = ref.replace(/[a-zа-я]/gi, '');
	//         Latin          Cyrrilic
	if(ref.startsWith('E') || ref.startsWith('Е')) {
		ref = number;
	}
	else if(ref.startsWith('N')) {
		ref = `N${number}`;
	}
	else if(ref.startsWith('Y')) {
		ref = `У${number}`;
	}
	return ref;
}

function process_routes_data(input_routes) {
	let output_routes = [];

	input_routes.forEach(input_route => {
		let output_route = {
			route_ref: determine_route_ref(input_route.name),
			temp_ref: Number(input_route.name.replace(/[a-zа-я]/gi, '')),
			cgm_id: input_route.ext_id,
		};
		determine_route_type(output_route, input_route.icon);
		output_route.temp_ref = Number(output_route.route_ref.replace(/[a-zа-я]/gi, ''));

		// let route_ref = output_route.temp_ref == output_route.route_ref?output_route.temp_ref:output_route.route_ref;
		// if(typeof route_ref == 'string' && route_ref.startsWith('N')) {
		// 	output_route.subtype = 'night';
		// }
		// else if(typeof route_ref == 'string' && route_ref.startsWith('E')) {
		// 	route_ref = output_route.temp_ref.toString();
		// }
		// else if(typeof route_ref == 'string' && (route_ref.startsWith('Y') || route_ref.startsWith('У'))) {
		// 	route_ref = `У${Number(output_route.temp_ref)}`;
		// 	output_route.subtype = 'school';
		// }
		// output_route.route_ref = route_ref.toString();


		// if(typeof route_ref == 'string' && (route_ref.includes('-')
					/* Latin */              /* Cyrrilic */
		// || route_ref.includes('TM') || route_ref.includes('ТМ')
		// || route_ref.includes('TB') || route_ref.includes('ТБ'))) {
		// 	output_route.type = 'bus';
		// 	output_route.subtype = 'temporary';
		// }
		output_routes.push(output_route);
	});

	output_routes.sort((a, b) => {
		if(a.type != b.type) {
			return main_types.indexOf(a.type)-main_types.indexOf(b.type);
		}
		if(a.subtype && !b.subtype) {
			return 1;
		}
		if(b.subtype && !a.subtype) {
			return -1;
		}
		return a.temp_ref - b.temp_ref;
	});
	console.table(output_routes)
	return output_routes;
}

export function fetch_schedule_data(cgm_id) {
	let schedule = fetch_data_from_sofiatraffic(schedule_url, {ext_id: cgm_id})
	.then(response => response.json());
	return schedule;
}
function generate_route_variants(segments) {
    let route_ids = [];
    segments.forEach(segment => {
        segment.route_ids = new Set(segment.stop.times.map(time => time.route_id));
        for(const route_id of segment.route_ids) {
            if(!route_ids.includes(route_id)) {
                route_ids.push(route_id);
            }
        }
    });
    let route_variants = route_ids.map(route_id => {
        return ({
            route_ids: [route_id],
            stops: segments
            .filter(segment => segment.route_ids.has(route_id))
            .map(segment => Number(segment.stop.code))
        })
    });
    return route_variants;
}

function merge_partial_variants(variants) {
	// use longest one as master
    const lengths = variants.map(variant=>variant.stops.length);
    const master_index = lengths.indexOf(Math.max(...lengths));
    let master = variants[master_index];
    let variants_to_remove = [];
    variants.forEach((variant, variant_index) => {
        if(variant_index == master_index) {
            variant.primary = true;
            return;
        }
        variant.secondary = true;
        let matches = master.stops.join(',').includes(variant.stops.join(','));
        if(matches) {
            master.secondary = true;
            master.route_ids.push(variant.route_ids[0]);
            variants_to_remove.unshift(variant_index);
        }
    });
    variants_to_remove.forEach(index => variants.splice(index, 1))

}

function process_stop_times(variants, segments) {
	// The function is used to regroup the stop times by variant (direction)
    variants.forEach(variant => variant.stop_times = []);
    segments.forEach(segment => {
        segment.stop.times.forEach(time => {
            let variant = variants.find(vari => vari.route_ids.includes(time.route_id));
            let stop_index = variant.stops.indexOf(Number(segment.stop.code));
            let time_obj = variant.stop_times.find(a_time => a_time.id == time.id);
            if(!time_obj) {
                time_obj = {id: time.id, is_weekend: time.weekend === 1, times: [], code: time.code};
                variant.stop_times.push(time_obj);
            }
            time_obj.times[stop_index] = parse_time(time.time);
        });
    });
}

export function process_schedule_data(cgm_route, route_index, directions, stop_times, trips, is_metro) {
	cgm_route.routes.forEach(route => {
		let variants = generate_route_variants(route.segments);
		merge_partial_variants(variants);
		process_stop_times(variants, route.segments);
		process_variants(variants, route_index, directions, stop_times, trips, is_metro);
	});
}

function process_variants(variants, route_index, directions, stop_times, trips, is_metro) {
	variants.forEach(variant => {
		const start_stop_times_index = stop_times.length;
		directions.push({code: variant.route_ids[0], stops: variant.stops});
		const weekday_time = variant.stop_times.find(stop_time => stop_time.is_weekend === false);
		let trip_weekday_index;
		const weekend_time = variant.stop_times.find(stop_time => stop_time.is_weekend === true);
		let trip_weekend_index;
		if(weekday_time) {
			const trip = {route_index: route_index, direction: variant.route_ids[0], is_weekend: false, code: weekday_time.code};
			trip_weekday_index = trips.push(trip) - 1;
		}
		if(weekend_time) {
			const trip = {route_index: route_index, direction: variant.route_ids[0], is_weekend: true, code: weekend_time.code};
			trip_weekend_index = trips.push(trip) - 1;
		}
		process_stop_times_for_variant(variant, stop_times, trip_weekday_index, trip_weekend_index);
		if(is_metro) {
			adjust_metro_stop_times(variant, directions, stop_times, start_stop_times_index);
		}
	});
}

function process_stop_times_for_variant(variant, stop_times, trip_weekday_index, trip_weekend_index) {
	variant.stop_times.forEach(stop_time => {
		stop_times.push({times: stop_time.times, trip: stop_time.is_weekend ? trip_weekend_index : trip_weekday_index});
	});
}

function adjust_metro_stop_times(variant, directions, stop_times, start_stop_times_index) {
	let stops_arr = variant.stops;
	let start_stop = stops_arr[0];
	let end_stop = stops_arr[stops_arr.length - 1];
	directions[directions.length - 1].stops = normalise_metro_stop_codes(start_stop, end_stop);
	/*if (start_stop == 212 || end_stop == 212) {
		stop_times.forEach((stop_time, index) => {
			if (index < start_stop_times_index) {
				return;
			}
			if (stop_time.times.length > stops_arr.length - 1) {
				if (start_stop == 212) {
					console.log('popped ', stop_time.times.pop());
				} else {
					console.log('shifted ', stop_time.times.shift());
				}
			}
		});
	}*/
}

export function get_routes_data() {
    return fetch_routes_data()
	.then(data => process_routes_data(data));
}
