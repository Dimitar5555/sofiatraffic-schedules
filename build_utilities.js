export function parse_time(time) {
	let split = time.split(':').map(Number);
	return split[0]*60+split[1];
}

var sofiatraffic_session_cookie;
var sofiatraffic_xsrf_token;

async function fetch_tokens() {
    let cookies_request = await fetch('https://sofiatraffic.bg/bg/public-transport', {"method": "HEAD"});
    let cookies = cookies_request.headers.getSetCookie();
    sofiatraffic_xsrf_token = decodeURIComponent(cookies[0].split(';')[0].split('=')[1]);
    sofiatraffic_session_cookie = decodeURIComponent(cookies[1].split(';')[0].split('=')[1]);
}

export async function fetch_data_from_sofiatraffic(url, body={}) {
    if(!sofiatraffic_session_cookie) {
        await fetch_tokens();
    }
    return fetch(url, {
        "method": "POST",
        "credentials": "include",
        "headers": {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/134.0",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-GB,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": sofiatraffic_xsrf_token,
            "Cookie": `XSRF-TOKEN=${sofiatraffic_xsrf_token}; sofia_traffic_session=${sofiatraffic_session_cookie}`,
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "Priority": "u=1",
            "Pragma": "no-cache",
            "Cache-Control": "no-cache",
            "Referrer": "https://www.sofiatraffic.bg/bg/public-transport",
            "TE": "trailers"
        },
        "body": JSON.stringify(body),
        "mode": "cors"
    });
}
