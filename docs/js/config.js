const url_prefix = '#!';

const enable_virtual_boards = true;
const enable_virtual_boards_for_subway_stations = true;
const virtual_board_proxy_url = 'https://sofiatraffic-proxy.onrender.com/virtual-board?stop_code=';

const enable_schedules_by_cars = false;

const VIRTUAL_BOARDS_DEFAULT_SETTINGS = {show_condensed_view: true, use_exact_times: true};

window.onload = function() {
    if(window.location.search.length > 0) {
        const params = new URLSearchParams(window.location.search);
        const type = params.get('type');
        if(['schedules', 'stops_map'].includes(type)) {
            window.history.replaceState({}, '', `/#!${type}/`);
        }
        else if(['metro', 'tram', 'trolley', 'bus'].includes(type)) {
            const route_ref = params.get('route');
            window.history.replaceState({}, '', `/#!${type}/${route_ref}/`);
        }
        else if(type == 'stop') {
            const stop_code = params.get('code');
            window.history.replaceState({}, '', `/#!stop/${stop_code}/`);
        }
    }
    if(!enable_schedules_by_cars) {
        document.querySelectorAll('.schedule_by_cars_related')
        .forEach(el => {
            el.remove();
        });
    }
};
