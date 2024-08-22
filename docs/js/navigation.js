function updateURL(page=false) {
	let new_hash = '';
	if(page){
		new_hash = page;
	}
	else if(current.view=='route'){
		var is_weekend_val = document.querySelector('[name=route_schedule_type]:checked').value;
		new_hash = `${url_prefix}${current.route.type}/${current.route.line}/${return_weekday_text(is_weekend_val)}/${current.trip.direction}/${current.stop_code}/`;
	}
	else if(current.view=='stop'){
		var is_weekend_val = document.querySelector('[name=stop_schedule_type]:checked').value;
		new_hash = `${url_prefix}stop/${format_stop_code(current.stop_code)}/${return_weekday_text(is_weekend_val)}/`;
	}
	if(window.location.hash==new_hash){
		return;
	}
	console.log('called updateURL: '+new_hash);
	manual_push_state(new_hash);
}

function handle_seo() {
	let hash = window.location.hash;
	let canonical_el = document.querySelector('link[rel=canonical]');
	let description_el = document.querySelector('meta[name=description]');
	if(hash.includes('#schedules')) {
		document.title.innerText = lang.titles.title;
		canonical_el.setAttribute('href', '#schedules');
		description_el.setAttribute('content', 'Актуални разписания на софийския градски транспорт.');
	}/*
	else if(hash.includes('#favourite_stops')) {
		document.title = `${lang.titles.favourite_stops} - ${lang.titles.short_title}`;
		canonical_el.setAttribute('href', '#favourite_stops');
		description_el.setAttribute('content', 'Актуални разписания на софийския градски транспорт.');
	}*/
	else if(hash.includes('#stops_map')) {
		document.title = `${lang.titles.stops_map} - ${lang.titles.short_title}`;
		canonical_el.setAttribute('href', '#stops_map');
		description_el.setAttribute('content', 'Интерактивна карта на спирките на софийския градски транспорт.');
	}
	else if(main_types_order.some(main_type => hash.includes(main_type))) {
		let split_hash = hash.replace('#', '').split('/').filter(el => el);
		let line_type = split_hash[0];
		let line_ref = split_hash[1];
		document.title = `${lang.titles.schedule_of} ${lang.line_type[line_type].toLowerCase()} ${line_ref} - ${lang.titles.short_title}`;
		canonical_el.setAttribute('href',`${url_prefix}${line_type}/${line_ref}/`);
		description_el.setAttribute('content', `Актуално разписание и маршрут на ${lang.line_type[line_type].toLowerCase()} ${line_ref}.`);
	}
	else if(hash.includes('#stop')) {
		let split_hash = hash.replace('#', '').split('/');
		let stop_code = split_hash[1];
		document.title = `${lang.titles.schedule_of} спирка ${get_stop_string(stop_code)} - ${lang.titles.short_title}`;
		canonical_el.setAttribute('href', `${url_prefix}stop/${stop_code}/`);
		description_el.setAttribute('content', `Актуално разписание на спирка ${get_stop_string(stop_code)}.`);
	}
}

function handle_page_change() {
	let hash = decodeURIComponent(window.location.hash).replace('#', '').split('/').filter(el => el);
	let main_tab_index = ['schedules', 'stops_map'].indexOf(hash[0]);
    console.log(hash)
    if(main_tab_index != -1) {
		tab_btns[main_tab_index].show();
		if(hash[0] == 'stops_map') {
			init_map();
		}
	}

	let globals = get_globals_from_hash(hash);
	console.log('detected globals', globals);
	if(globals.is_stop || globals.is_route) {
		update_globals(globals);
		show_schedule(globals, false, hash.length != 2);
	}
	handle_seo();
}

function manual_push_state(new_href) {
	//window.location.replace(new_href)
    debugger;
	history.replaceState(null, null, new_href);
    console.log('called manual pushstate');
	handle_page_change();
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
		manual_push_state(generate_current_hash());
		
	}
	else if(current.view == 'route') {
		line_selector_div.classList.add('d-none');
		stop_schedule_div.classList.add('d-none');
		schedule_display.classList.remove('d-none');
		manual_push_state(generate_current_hash());
	}
	else {
		line_selector_div.classList.remove('d-none');
		stop_schedule_div.classList.add('d-none');
		schedule_display.classList.add('d-none');
		manual_push_state(`${url_prefix}schedules`);
	}
}

function generate_current_hash() {
	if(current.view == 'stop') {
		return `${url_prefix}stop/${current.stop_code}/`;
	}
	else if(current.view == 'route') {
		return `${url_prefix}${current.route.type}/${current.route.line}/${current.direction.code}/${current.stop_code}`;
	}
}


window.addEventListener('popstate', function(event) {
	handle_page_change();
});

window.addEventListener('pushstate', function(event) {
	handle_page_change();
});