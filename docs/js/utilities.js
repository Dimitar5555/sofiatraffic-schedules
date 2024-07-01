function format_stop_code(code){
	return code.toString().padStart(4, '0');
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
    btn_group.appendChild(html_comp('button', {
        text: lang.schedules.schedule,
        'data-code': stop_code,
        onclick: `show_schedule({stop_code: this.dataset.code, is_stop: true})`,
        class: 'btn btn-outline-primary'
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
	var el = html_comp('button', {
		text: route.line,
		class: `line_selector_btn text-${route.line=='M4'?'dark':'light'} rounded-1 ${route.type!=='metro'?route.type:route.line}-bg-color`,
		'onclick': `show_schedule({route: data.routes[${route.index}], is_route: true})`
	});
	return el;
}