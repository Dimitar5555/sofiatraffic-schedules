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
		return data.stops.find(stop => stop.code === stop_arg);
	}
}
//accepts stop_code or stop object, in order to maintain consistent stop names
function get_stop_name(stop_code){
	if(!stop_code || stop_code==undefined){
		return '(НЕИЗВЕСТНА СПИРКА)';
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
    return Number(stop_code)>2900 && Number(stop_code)<3400
}
function generate_schedule_departure_board_buttons (stop_code, parent=false) {
    var btn_group = html_comp('div', {class: 'btn-group'});
    btn_group.appendChild(html_comp('button', {
        'data-code': stop_code,
        'data-bs-toggle':'modal',
        'data-bs-target': '#sofiatraffic_live_data',
        text: lang.actions.virtual_table,
        onclick: 'load_virtual_table(this.dataset.code)',
        class: 'btn btn-outline-primary'
    }));
    btn_group.appendChild(html_comp('a', {
        text: lang.schedules.schedule,
        //'data-code': stop_code,
        //onclick: `show_schedule({stop_code: this.dataset.code, is_stop: true})`,
        class: 'btn btn-outline-primary',
        href: `#stop/${stop_code}/`
    }));
    if(is_metro_stop(stop_code)){
        btn_group.children.item(0).setAttribute('disabled', '');
    }
    if(!parent){
        return btn_group;
    }
    parent.appendChild(btn_group);
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
		text: route.line,
		class: `line_selector_btn  rounded-1 ${get_route_colour_classes(route)}`,
		//'onclick': `show_schedule({route: data.routes[${route.index}], is_route: true})`,
        href: `#${route.type}/${route.line}/`
	});
	return el;
}
function get_route_colour_classes(route){
    let bg_color = `${route.type!=='metro'?route.type:route.line}-bg-color`;
    let fg_color = `text-${route.line=='M4'?'dark':'light'}`;
    return  `px-2 ${bg_color} ${fg_color}`;
}
function is_weekend(boolean){
    let result = boolean === '1' || boolean === true || boolean === 'true' || boolean === 1;
    return result;
}
function return_weekday_text(boolean){
    return is_weekend(boolean)?'weekend':'workday';
}