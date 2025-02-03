function virtual_board_toggle_exact_times(show_exact_times) {
    const els = document.querySelectorAll('span[data-time-type]');
    for(let el of els) {
        const is_exact_time = el.dataset.timeType == 'exact_time';
        const should_hide = is_exact_time != show_exact_times;
        el.classList.toggle('d-none', should_hide);
    }
}

function virtual_board_toggle_condensed_view(show_condensed_view) {
    const condensed_tbody = document.querySelector('tbody#virtual_board_condensed_view');
    const verbose_tbody = document.querySelector('tbody#virtual_board_verbose_view');

    condensed_tbody.classList.toggle('d-none', !show_condensed_view);
    verbose_tbody.classList.toggle('d-none', show_condensed_view);
}

function virtual_board_add_icons(extras, td) {
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

function generate_condensed_virtual_board_table(routes, tbody, date) {
    routes.forEach((route, row_index) => {
        generate_virtual_board_row(route, row_index, tbody, date);
    });
}

function generate_time_el(time, exact_time, date) {
    // type: relative / exact
    let span = html_comp('span');
    if(exact_time) {
        span.setAttribute('data-time-type', 'exact_time');
        span.innerText = format_time(date.getHours()*60+date.getMinutes()+time, false);
    }
    else {
        span.setAttribute('data-time-type', 'relative_time');
        span.innerText = `${time} мин.`;
    }
    return span;
}

function generate_time_and_icons(time, extras, date, td) {
    const exactTimeEl = generate_time_el(time, true, date);
    const relativeTimeEl = generate_time_el(time, false, date);
    
    td.appendChild(exactTimeEl);
    td.appendChild(relativeTimeEl);
    virtual_board_add_icons(extras, td);
}


function generate_route_td(route) {
    const td = html_comp('td', {class: 'align-middle'});
    const span = html_comp('span', {class: get_route_colour_classes(route), text: route.route_ref});
    td.appendChild(span);
    td.appendChild(html_comp('i', {class: 'bi bi-caret-right-fill'}));
    td.appendChild(document.createTextNode(get_stop_name(route.destination)));
    return td;
}

function generate_virtual_board_row(route, row_index, tbody, date) {
    let tr = html_comp('tr');
    const td_route = generate_route_td(route);
    tr.appendChild(td_route);
    
    for(const time of route.times) {
        let td = html_comp('td', {class: 'align-middle'});
        
        generate_time_and_icons(time.t, time.extras, date, td);
        tr.appendChild(td);
    }
    let needed_cells = 3-route.times.length;
    while(needed_cells>0) {
        tr.appendChild(html_comp('td', {text: '-', class: 'align-middle'}));
        needed_cells--;
    }
    if(row_index == 0) {
        tr.children.item(0).classList.add('col-4');
        tr.children.item(1).classList.add('col-2');
        tr.children.item(2).classList.add('col-2');
        tr.children.item(3).classList.add('col-2');
    }
    tbody.appendChild(tr);
}

function generate_verbose_virtual_board_table(routes, tbody, date) {
    let new_data = [];

    for(let route of routes) {
        for(let time of route.times) {
            new_data.push({
                route_ref: route.route_ref,
                type: route.type,
                destination: route.destination,
                time: time.t,
                extras: time.extras
            });
        }
    }

    new_data.sort((a, b) => a.time - b.time);
    for(let row of new_data) {
        let tr = html_comp('tr');
        const tdRoute = generate_route_td(row);
        tdRoute.setAttribute('colspan', 2);
        tr.appendChild(tdRoute);

        {
            let td = html_comp('td', {class: 'align-middle'});
            td.setAttribute('colspan', 2);

            generate_time_and_icons(row.time, row.extras, date, td);
            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    }
}

function populate_virtual_board_table(routes, new_condensed_tbody, new_verbose_tbody, date, use_exact_times, show_condensed_view) {
    generate_condensed_virtual_board_table(routes, new_condensed_tbody, date);
    generate_verbose_virtual_board_table(routes, new_verbose_tbody, date);
    virtual_board_toggle_exact_times(use_exact_times);
    virtual_board_toggle_condensed_view(show_condensed_view);
}

function virtual_board_show_info(id) {
    const tbody = document.querySelector('#virtual_board_information');
    if(id === false) {
        tbody.classList.add('d-none');
        return;
    }
    const rows = tbody.querySelectorAll('tr');
    for(let row of rows) {
        if(row.id != id || id == false) {
            row.classList.add('d-none');
        }
        else {
            row.classList.remove('d-none');
        }
    }
    tbody.classList.remove('d-none');
}