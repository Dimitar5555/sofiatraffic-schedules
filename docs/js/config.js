const url_prefix = '#!';

const enable_virtual_boards = true;
const enable_virtual_boards_for_subway_stations = true;
const virtual_board_proxy_url = 'https://sofiatraffic-proxy.onrender.com/virtual-board?stop_code=';

const enable_schedules_by_cars = false;

window.onload = function() {
    if(!enable_schedules_by_cars) {
        document.querySelectorAll('.schedule_by_cars_related')
        .forEach(el => {
            el.remove();
        });
    }
};