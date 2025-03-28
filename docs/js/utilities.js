function get_split_hash() {
    let hash = window.location.hash;
    if(hash == '') {
        hash = (new URL(document.location)).searchParams.get('_escaped_fragment_');

    }
    return decodeURIComponent(hash)
    .replace('#', '')
    .replace('!', '')
    .split('/')
    .filter(el => el);
}

function format_stop_code(stop_code) {
    if(!stop_code) {
        return '????'
    }
	return stop_code.toString().padStart(4, '0');
}

function get_stop(stop_arg){
	if(typeof stop_arg=='string'){
		stop_arg = Number(stop_arg);
	}
	if(typeof stop_arg=='object'){
		return stop_arg;
	}
	else if(typeof stop_arg=='number'){
		return data.stops.find(stop => stop.code === stop_arg) || {code: stop_arg, names: {bg: `(${lang.schedules.unknown_stop})`}};
	}
}

//accepts stop_code or stop object, in order to maintain consistent stop names
function get_stop_name_by_code(stop_code){
	if(!stop_code || stop_code==undefined){
		return `(${lang.schedules.unknown_stop})`;
	}
    var stop = get_stop(stop_code);
	if(!stop){
        console.error(`Missing stop with code: ${stop_code}`);
	}
    return get_stop_name_from_object(stop);
}

function get_stop_name_from_object(stop_obj) {
    const stop_name = stop_obj.names[lang.code];
    if(!stop_name){
        return `(${lang.schedules.unknown_stop})`;
    }
    if(is_metro_stop(stop_obj.code)) {
        return stop_name.replace('МЕТРОСТАНЦИЯ', '').replace('METRO STATION', '').replace('METROSTANTSIA', '').replaceAll('  ', ' ').trim();
    }
   // TODO: Remove this monkey patch, when SUMC fixes their data
    if(stop_name == 'Ж. К. ОБЕЛЯ 3') {
        stop_name = 'Ж. К. ОБЕЛЯ 2';
    }
    return stop_name;
}

function get_stop_string(stop_code_or_object) {
    let stop_obj = get_stop(stop_code_or_object);
    return `[${format_stop_code(stop_obj.code)}] ${get_stop_name_from_object(stop_obj)}`;
}

function format_date_string(string){
    return new Date(string).toLocaleDateString(lang.code);
}

function is_metro_stop(stop_code){
    return 2900 < Number(stop_code) && Number(stop_code) < 3400
}

function generate_button(stop_code, type, text, is_favorite) {
    /*
    options:
        stop_code: integer

        type: [schedule / departures_board / locate_stop]
        type specifies the used icon as well

        text: [true / false]
        whether to show any text, true by default

    */
    const btns_data = {
        favourite_stop: {
            type: 'btn',
            icon: 'bi-star',
            text: '',
        },
        departures_board: {
            type: 'button',
            icon: 'bi-clock',
            text: lang.actions.virtual_board,
            disable_condition: (stop_code) => !enable_virtual_boards ||
            ( !enable_virtual_boards_for_subway_stations && is_metro_stop(stop_code) )
        },
        schedule: {
            type: 'a',
            icon: 'bi-table',
            text: lang.actions.schedule
        },
        locate_stop: {
            type: 'button',
            icon: 'bi-crosshair',
            text: lang.actions.locate_stop_on_map
        }
    };

    const btn_data = btns_data[type];

    const btn = html_comp(btn_data.type, {
        class: 'btn btn-outline-primary'
    });
    btn.appendChild(html_comp('i', {class: `bi ${btn_data.icon}${text?'':' text-nowrap'}`}));
    if(text) {
        btn.appendChild(document.createTextNode(' '));
        btn.appendChild(html_comp('span', {text: btn_data.text, class: 'd-none d-md-inline'}));
    }
    else {
        btn.setAttribute('title', btn_data.text);
    }

    if(type === STOP_BTN_TYPES.favourite_stop) {
        btn.setAttribute('data-code', stop_code);
        btn.setAttribute('onclick', `toggle_favourite_stop(Number(this.dataset.code));filter_stops();`);

        btn.setAttribute('onmouseover', "toggle_star(this.children[0], 'over')");
        btn.setAttribute('onmouseout', "toggle_star(this.children[0], 'out')");
        
        const star = btn.children[0];
        star.dataset.style = 'empty';
        if(is_favorite) {
            star.dataset.style = 'fill';
            star.classList.add('bi-star-fill');
            star.classList.remove('bi-star');
        }
    }
    else if(type === STOP_BTN_TYPES.departures_board) {
        if(btn_data.disable_condition(stop_code)) {
            btn.setAttribute('disabled', '');
        }
        else {
            btn.setAttribute('data-code', stop_code);
            btn.setAttribute('data-bs-toggle', 'modal');
            btn.setAttribute('data-bs-target', '#sofiatraffic_live_data');
            btn.setAttribute('onclick', 'load_virtual_board(this.dataset.code)');
        }
    }
    else if(type === STOP_BTN_TYPES.schedule) {
        btn.setAttribute('href', `${url_prefix}stop/${stop_code}/`);
    }
    else if(type === STOP_BTN_TYPES.locate_stop) {
        btn.setAttribute('data-code', stop_code);
        btn.setAttribute('onclick', `zoom_to_stop(this.dataset.code)`);
    }
    
    return btn;
}
    
function generate_btn_group(stop_code, btn_types, text, is_favorite) {
    /*
    options:
        type: [schedule / departures_board / locate_stop]
        type specifies the used icon as well

        text: [true / false]
        whether to show any text, true by default

        stop_code: integer
    */
   const btn_group = html_comp('div', {class: 'btn-group'});
    for(const btn_type of btn_types) {
        const btn = generate_button(stop_code, btn_type, text, is_favorite);
        btn_group.appendChild(btn);
    }
    return btn_group;
}

function zoom_to_stop(stop_code) {
    if(is_screen_width_lg_or_less()) {
        document.querySelector('#map').scrollIntoView({behavior: 'smooth'});
    }
    let marker = get_stop(stop_code).marker;
    map.flyTo(marker.getLatLng(), 17, {
		animate: false
	});
    marker.openPopup();
}

function html_comp(tag, attributes={}){
	var el = document.createElement(tag);
	var keys = Object.keys(attributes);
	keys.forEach(key => {
		if(key=='text'){
			el.innerText = attributes[key];
			return;
		}
		el.setAttribute(key, attributes[key]);
    });
	return el;
}
function generate_line_btn(route){
    let font_size = `fs-${route.subtype=='temporary'?6:5}`;
	var el = html_comp('a', {
		text: route.route_ref,
		class: `line_selector_btn rounded-1 ${get_route_colour_classes(route, false)} ${font_size} fw-bolder`,
		//'onclick': `show_schedule({route: data.routes[${route.index}], is_route: true})`,
        href: `${url_prefix}${route.type}/${route.route_ref}/`,
        //onclick: 'event.preventDefault(); manual_push_state(this.href);'
	});
	return el;
}
function get_route_colour_classes(route, padding=true){
    const route_type = route.type;
    const route_ref = route.route_ref

    const bg_color = `${route_type!=='metro'?route_type:route_ref}-bg-color`;
    const padding_class = padding?' py-1 px-2':'';
    const fg_color = `text-${route_ref=='M4'?'dark':'light'}`;
    return  `fw-bolder rounded-1 ${bg_color} ${fg_color} ${padding?padding_class:''}`;
}
function is_weekend(boolean){
    let result = boolean === '1' || boolean === true || boolean === 'true' || boolean === 1 || boolean === 'weekend';
    return result;
}
function return_weekday_text(boolean){
    return is_weekend(boolean)?'weekend':'workday';
}

function is_online() {
    return navigator.onLine;
}

function is_screen_width_lg_or_less() {
    return window.innerWidth <= 992;
}