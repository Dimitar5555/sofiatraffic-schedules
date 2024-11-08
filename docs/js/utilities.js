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

function format_stop_code(stop_code){
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
function get_stop_name(stop_code){
	if(!stop_code || stop_code==undefined){
		return `(${lang.schedules.unknown_stop})`;
	}
    var stop = get_stop(stop_code);
	if(!stop){
        console.error(`Missing stop with code: ${stop_code}`);
	}
    stop_code = stop?.code;
    if(is_metro_stop(stop_code)){
        return stop.names[lang.code].replace('МЕТРОСТАНЦИЯ', '').replace('METRO STATION', '').replace('METROSTANTSIA', '').replaceAll('  ', ' ').trim() || "(НЕИЗВЕСТНА СПИРКА)";
    }
    return stop?.names[lang.code] || `(${lang.schedules.unknown_stop})`;
}
function get_stop_string(stop_code_or_object) {
    let stop_obj = get_stop(stop_code_or_object);
    return `[${format_stop_code(stop_obj.code)}] ${get_stop_name(stop_obj)}`;
}
function format_date_string(string){
    return new Date(string).toLocaleDateString(lang.code);
}
function is_metro_stop(stop_code){
    return 2900 < Number(stop_code) && Number(stop_code) < 3400
}

function generate_stop_action_buttons(stop_code, options={}) {
    if(!options.icons_only) {
        options.icons_only = false;
    }
    if(!options.virtual_board_btn && options.virtual_board_btn != false) {
        options.virtual_board_btn = true;
    }
    if(!options.stop_schedule_btn && options.stop_schedule_btn != false) {
        options.stop_schedule_btn = true;
    }
    if(!options.pan_btn) {
        options.pan_btn = false;
    }

    let btn_group = html_comp('div', {class: 'btn-group'});
    if(options.virtual_board_btn) {
        let virtual_board_btn = html_comp('button', {
            'data-code': stop_code,
            'data-bs-toggle':'modal',
            'data-bs-target': '#sofiatraffic_live_data',
            onclick: 'load_virtual_board(this.dataset.code)',
            class: 'btn btn-outline-primary'
        });
        if(is_metro_stop(stop_code) && !enable_virtual_boards_for_subway_stations || !enable_virtual_boards){
            virtual_board_btn.setAttribute('disabled', '');
        }
        virtual_board_btn.appendChild(html_comp('i', {class: 'bi bi-clock'}));
        if(!options.icons_only) {
            virtual_board_btn.classList.add('text-nowrap')
            virtual_board_btn.appendChild(html_comp('span', {text: ` ${lang.actions.virtual_board}`, class: 'd-none d-md-inline'}));
        }
        else {
            virtual_board_btn.setAttribute('title', lang.actions.virtual_board);
        }
        btn_group.appendChild(virtual_board_btn);
    }
    
    if(options.stop_schedule_btn) {
        let stop_schedule_btn = html_comp('a', {
            class: 'btn btn-outline-primary',
            href: `${url_prefix}stop/${stop_code}/`
        });
        stop_schedule_btn.appendChild(html_comp('i', {class: 'bi bi-table'}));
        if(!options.icons_only) {
            stop_schedule_btn.classList.add('text-nowrap')
            stop_schedule_btn.appendChild(html_comp('span', {text: ` ${lang.actions.schedule}`, class: 'd-none d-md-inline'}));
        }
        else {
            stop_schedule_btn.setAttribute('title', lang.actions.stop_schedule);
        }
        btn_group.appendChild(stop_schedule_btn);
    }

    if(options.pan_btn) {
        let pan_btn = html_comp('button', {
            class: 'btn btn-outline-primary',
            onclick: `zoom_to_stop(${stop_code})`
        });
        pan_btn.appendChild(html_comp('i', {class: 'bi bi-crosshair'}));
        pan_btn.setAttribute('title', lang.actions.locate_stop_on_map);
        btn_group.appendChild(pan_btn);
    }
    return btn_group;
}

function zoom_to_stop(stop_code) {
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
		el.setAttribute(key, attributes[key])});
	return el;
}
function generate_line_btn(route){
	var el = html_comp('a', {
		text: route.route_ref,
		class: `line_selector_btn  rounded-1 ${get_route_colour_classes(route)} fs-5 fw-bolder`,
		//'onclick': `show_schedule({route: data.routes[${route.index}], is_route: true})`,
        href: `${url_prefix}${route.type}/${route.route_ref}/`,
        //onclick: 'event.preventDefault(); manual_push_state(this.href);'
	});
	return el;
}
function get_route_colour_classes(route){
    let bg_color = `${route.type!=='metro'?route.type:route.route_ref}-bg-color`;
    let fg_color = `text-${route.route_ref=='M4'?'dark':'light'}`;
    return  `px-2 ${bg_color} ${fg_color}`;
}
function is_weekend(boolean){
    let result = boolean === '1' || boolean === true || boolean === 'true' || boolean === 1 || boolean === 'weekend';
    return result;
}
function return_weekday_text(boolean){
    return is_weekend(boolean)?'weekend':'workday';
}