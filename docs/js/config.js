const url_prefix = '#!';

const enable_virtual_boards = true;
const enable_virtual_boards_for_subway_stations = true;
const virtual_board_proxy_url = 'https://sofiatraffic-proxy.onrender.com/virtual-board?stop_code=';

const enable_schedules_by_cars = false;

const VIRTUAL_BOARDS_DEFAULT_SETTINGS = {show_condensed_view: true, use_exact_times: true};

const STOP_BTN_TYPES = {
    favourite_stop: 'favourite_stop',
    departures_board: 'departures_board',
    schedule: 'schedule',
    locate_stop: 'locate_stop'
}

window.onload = function() {
    if(window.location.search.length > 0) {
        const params = new URLSearchParams(window.location.search);
        const type = params.get('type');
        let new_url = '/';
        if(window.location.hostname.includes('github')) {
            new_url += 'sofiatraffic-schedules/';
        }
        if(['schedules', 'stops_map'].includes(type)) {
            new_url += `#!${type}/`;
        }
        else if(['metro', 'tram', 'trolley', 'bus'].includes(type)) {
            const route_ref = params.get('route');
            new_url += `#!${type}/${route_ref}/`;
        }
        else if(type == 'stop') {
            const stop_code = params.get('code');
            new_url += `#!stop/${stop_code}/`;
        }
        window.history.replaceState({}, '', new_url);
    }
    if(!enable_schedules_by_cars) {
        document.querySelectorAll('.schedule_by_cars_related')
        .forEach(el => {
            el.remove();
        });
    }
};
