var mapbox_polyline = require('@mapbox/polyline');

var sofiatraffic_session_cookie;
var sofiatraffic_xsrf_token;
const get_lines_url = 'https://www.sofiatraffic.bg/en/trip/getLines';
const cookies = `sofia_traffic_session=${sofiatraffic_session_cookie}; XSRF-TOKEN=${sofiatraffic_xsrf_token}`;

async function fetch_tokens() {
    let cookies_request = await fetch('https://sofiatraffic.bg/bg/public-transport');
    let cookies = cookies_request.headers.getSetCookie();
    sofiatraffic_xsrf_token = decodeURIComponent(cookies[0].split(';')[0].split('=')[1]);
    sofiatraffic_session_cookie = decodeURIComponent(cookies[1].split(';')[0].split('=')[1]);
}

async function fetch_url(url, options={}) {
    options.headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-GB,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": sofiatraffic_xsrf_token,
        "Cookie": `sofia_traffic_session=${sofiatraffic_session_cookie}`,
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Priority": "u=1",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
        "Referrer": "https://www.sofiatraffic.bg/bg/public-transport",
        "TE": "trailers"
    };
    options.referrer = "https://www.sofiatraffic.bg/bg/public-transport";
    options.credentials = 'include';
    options.mode = 'cors';
    if(!options.method){
        options.method = 'POST';
    }
    return await fetch(url, options);
}

async function fetch_new_lines() {
    let response = await fetch_url(get_lines_url);
    let lines = await response.json();
    return lines;
}

async function get_polylines(line_id, failed_attempts=0){
    let body = {
        "line_id": line_id,
        "id": line_id
    }
    let response = await fetch_url('https://www.sofiatraffic.bg/bg/trip/getSchedule', {
        body: JSON.stringify(body)
    });
    let data = await response.json();
    // other route types seems to be temporary/partial
    if(data.message){
        if(failed_attempts==2){
            console.error(`Can't get schedule for line_id=${line_id}`);
            return undefined;
        }
        console.warn(`Retrying get_polyline for line_id=${line_id}`);
        return await get_polylines(line_id, failed_attempts+1);
    }
    return data.routes//.filter(route => route.type==1);
}

async function match_routes_and_polylines(cgm_routes, routes, directions) {
    for(const cgm_route of cgm_routes) {
        let line_type = [undefined, 'autobus', 'tramway', 'metro', 'trolleybus', 'autobus'][cgm_route.type];
        let line_number = cgm_route.name;
        line_number = Number(line_number).toString()==line_number?Number(line_number):line_number;
        let route = routes.find(route => route.type==line_type && route.line==line_number);
        if(route){
            // fetch polylines
            let polylines = await get_polylines(cgm_route.line_id);
            polylines.forEach(polyline => {
                //determine direction for polyline based on start end end stops
                console.log(polyline.segments[0]);
                let start_stop_code = Number(polyline.segments[0].stop.code);
                let end_stop_code = Number(polyline.segments[polyline.segments.length-1].end_stop.code);
                let direction = directions.find(dir => !dir.polyline && start_stop_code == dir.stops[0] && end_stop_code == dir.stops.toReversed()[0]);
                if(direction){
                    direction.polyline = mapbox_polyline.encode(polyline.details.polyline.replaceAll('LINESTRING (', '').replaceAll(')', '').split(', ').map(pair => pair.split(' ').toReversed()));
                }
                else{
                    console.error(cgm_route);
                    console.error("No route with", start_stop_code, end_stop_code);
                }
            });
        }
    }
    return true;
}

async function init_get_polylines(routes, directions) {
    await fetch_tokens();
    let new_lines = await fetch_new_lines();
    await match_routes_and_polylines(new_lines, routes, directions);
    console.log('With polyline/total', directions.filter(dir => dir.polyline).length, directions.length);
}

module.exports = {
    init_get_polylines: init_get_polylines
};
