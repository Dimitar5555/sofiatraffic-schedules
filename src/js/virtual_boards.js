import { get_route_colour_classes, get_stop_name_by_code } from './utilities';
import { html_comp } from './utilities';
import { format_time } from './schedules';

window.virtual_board_toggle_exact_times = function(show_exact_times) {
    const els = document.querySelectorAll('span[data-time-type]');
    for(let el of els) {
        const is_exact_time = el.dataset.timeType == 'exact_time';
        const should_hide = is_exact_time != show_exact_times;
        el.classList.toggle('d-none', should_hide);
    }
}

window.virtual_board_toggle_condensed_view = function(show_condensed_view) {
    const condensed_tbody = document.querySelector('tbody#virtual_board_condensed_view');
    const verbose_tbody = document.querySelector('tbody#virtual_board_verbose_view');

    condensed_tbody.classList.toggle('d-none', !show_condensed_view);
    verbose_tbody.classList.toggle('d-none', show_condensed_view);
}

function virtual_board_append_icons(extras, td) {
    const icons = [
        {
            // air conditioning
            icon: 'snow',
            condition: extras[0] === '1'
        },
        {
            // wheelchair access
            icon: 'person-wheelchair',
            condition: extras[1] === '1'
        },
        {
            // bike rack
            icon: 'bicycle',
            condition: extras[2] === '1'
        }
    ];
    if(icons.some(icon => icon.condition)) {
        td.appendChild(document.createTextNode(' '));
        let span = html_comp('span', {class: 'text-nowrap'});
        for(const icon of icons) {
            if(icon.condition) {
                span.appendChild(html_comp('i', {class: `bi bi-${icon.icon}`}));
                span.appendChild(document.createTextNode(' '));
            }
        }
        span.removeChild(span.lastChild);
        td.appendChild(span);
    }
}

function generate_virtual_board_table(routes, tbody, date, is_verbose) {
    let new_data = routes;
    if(is_verbose) {
        new_data = [];
        for(const route of routes) {
            for(const time of route.times) {
                new_data.push({
                    route_ref: route.route_ref,
                    type: route.type,
                    subtype: route.subtype,
                    times: [{t: time.t, extras: time.extras}],
                    destination: route.destination
                });
            }
        }

        new_data.sort((a, b) => a.times[0].t - b.times[0].t);
    }
    
    // display result
    new_data.forEach((route, row_index) => {
        virtual_board_append_row(route, row_index, tbody, date, is_verbose);
    });
}

function generate_time_el(time, exact_time, date) {
    // type: relative / exact
    let span = html_comp('span');
    let text;
    const time_type = exact_time ? 'exact_time' : 'relative_time';
    if(exact_time) {
        text = format_time(date.getHours()*60+date.getMinutes()+time, false);
    }
    else {
        text = `${time} мин.`;
    }
    span.innerText = text;
    span.setAttribute('data-time-type', time_type);
    return span;
}

function virtual_board_append_time_and_icons(time, extras, date, td) {
    const exactTimeEl = generate_time_el(time, true, date);
    const relativeTimeEl = generate_time_el(time, false, date);
    
    td.appendChild(exactTimeEl);
    td.appendChild(relativeTimeEl);
    virtual_board_append_icons(extras, td);
}


function generate_route_td(route) {
    const td = html_comp('td');
    const span = html_comp('span', {class: get_route_colour_classes(route), text: route.route_ref});
    td.appendChild(span);
    td.appendChild(html_comp('i', {class: 'bi bi-caret-right-fill'}));
    td.appendChild(document.createTextNode(get_stop_name_by_code(route.destination)));
    return td;
}

function virtual_board_append_row(route, row_index, tbody, date, is_verbose=false) {
    const header_tr = html_comp('tr');
    const td_route = generate_route_td(route);
    if(!is_verbose) {
        td_route.setAttribute('colspan', 3);
    }
    header_tr.appendChild(td_route);
    
    const times_tr = is_verbose ? header_tr : html_comp('tr');
    for(const time of route.times) {
        const td = html_comp('td');
        
        virtual_board_append_time_and_icons(time.t, time.extras, date, td);
        times_tr.appendChild(td);
    }
    let needed_cells = (is_verbose?1:3)-route.times.length;
    while(needed_cells>0) {
        times_tr.appendChild(html_comp('td', {text: '-'}));
        needed_cells--;
    }
    if(row_index == 0 && !is_verbose) {
        // header_tr.children.item(0).classList.add('col-12');
        times_tr.children.item(0).classList.add('col-4');
        times_tr.children.item(1).classList.add('col-4');
        times_tr.children.item(2).classList.add('col-4');
    }
    else if(row_index == 0 && is_verbose) {
        times_tr.children.item(0).classList.add('col-10');
        times_tr.children.item(1).classList.add('col-2');
    }
    tbody.appendChild(header_tr);
    if(!is_verbose) {
        tbody.appendChild(times_tr);
    }
}

export function populate_virtual_board_table(routes, new_condensed_tbody, new_verbose_tbody, date) {
    const use_exact_times = document.querySelector('#virtual_board_show_exact_time').checked;
    const show_condensed_view = document.querySelector('#virtual_board_show_condensed').checked;

    generate_virtual_board_table(routes, new_condensed_tbody, date, false);
    generate_virtual_board_table(routes, new_verbose_tbody, date, true);
    virtual_board_toggle_exact_times(use_exact_times);
    virtual_board_toggle_condensed_view(show_condensed_view);
}

export function virtual_board_show_info(id) {
    const tbody = document.querySelector('#virtual_board_information');
    if(id === false) {
        tbody.classList.add('d-none');
        return;
    }
    const rows = tbody.querySelectorAll('tr');
    for(const row of rows) {
        const should_be_hidden = row.id != id || id === false;
        row.classList.toggle('d-none', should_be_hidden);
    }
    tbody.classList.remove('d-none');
}