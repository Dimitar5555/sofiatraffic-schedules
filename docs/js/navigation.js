function updateURL(page=false) {
	let new_hash = '';
	if(page){
		new_hash = page;
	}
	else if(current.view=='route'){
		var is_weekend_val = document.querySelector('[name=route_schedule_type]:checked').value;
		new_hash = `${url_prefix}${current.route.type}/${current.route.route_ref}/${return_weekday_text(is_weekend_val)}/${current.direction.code}/${current.stop_code}/`;
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

function set_canonical_url(hash) {
	var canonical_el = document.querySelector('link[rel=canonical]');
	if(!canonical_el) {
		canonical_el = html_comp('link', {rel: 'canonical'});
		document.head.appendChild(canonical_el);
	}
	canonical_el.setAttribute('href', `https://dimitar5555.github.io/sofiatraffic-schedules/${url_prefix}${hash}`);
}

function set_page_description(description) {
	let description_el = document.querySelector('meta[name=description]');
	description_el.setAttribute('content', description);
}

function handle_seo() {
	let split_hash = get_split_hash();
	let line_type = split_hash[0];
	let route_ref = split_hash[1];
	let stop_code = split_hash[1];

	function generate_title(hash) {
		if(hash.includes('stops_map')) {
			return `${lang.titles.stops_map} - ${lang.titles.short_title}`;
		}
		else if(main_types_order.some(main_type => hash.includes(main_type))) {
			return  `${lang.titles.schedule_of} ${lang.line_type[line_type].toLowerCase()} ${route_ref} - ${lang.titles.short_title}`;
		}
		else if(hash.includes('stop')) {
			return `${lang.titles.schedule_of} спирка ${get_stop_string(stop_code)} - ${lang.titles.short_title}`;
		}
		else {
			return lang.titles.title;
		}
	}
	let new_title = generate_title(split_hash);
	let title_changed = document.title != new_title;
	if(title_changed) {
		document.title = new_title;
		if(split_hash.includes('schedules')) {
			set_canonical_url('schedules');
			set_page_description('content', 'Актуални разписания на софийския градски транспорт.');
		}
		else if(split_hash.includes('stops_map')) {
			set_canonical_url('stops_map');
			set_page_description('Интерактивна карта на спирките на софийския градски транспорт.');
		}
		else if(main_types_order.some(main_type => split_hash.includes(main_type))) {
			set_canonical_url(`${line_type}/${route_ref}/`);
			set_page_description(`Актуално разписание и маршрут на ${lang.line_type[line_type].toLowerCase()} ${route_ref}.`);
		}
		else if(split_hash.includes('#stop')) {
			set_canonical_url(`stop/${stop_code}/`);
			set_page_description(`Актуално разписание на спирка ${get_stop_string(stop_code)}.`);
		}
		gtag('event', 'page_view', {
			page_title: document.title,
			page_location: location.pathname+location.hash
		});
	}
}

function handle_page_change() {
	handle_seo();
	let hash = get_split_hash().filter(el => el);
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
		var route_ref = hash[1];
		var route_index = data.routes.findIndex(route => route.type==type && route.route_ref==route_ref);

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
		return `${url_prefix}${current.route.type}/${current.route.route_ref}/${current.direction.code}/${current.stop_code}`;
	}
}


window.addEventListener('popstate', function(event) {
	handle_page_change();
});

window.addEventListener('pushstate', function(event) {
	handle_page_change();
});