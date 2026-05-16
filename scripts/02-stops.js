import fs from 'fs'
import csvtojson from 'csvtojson'
import { osm_stops_types, osm_network_name } from './config.js';

function round_stop_coords(lat, lon) {
    return [
        parseFloat(parseFloat(lat).toFixed(5)),
        parseFloat(parseFloat(lon).toFixed(5)),
    ];
}

function transliterate(text) {
    const cyrillic = 'А,Б,В,Г,Д,Е,Ж,З,И,Й,К,Л,М,Н,О,П,Р,С,Т,У,Ф,Х,Ц,Ч,Ш,Щ,Ъ,Ь,Ю,Я'.split(',');
    const latin = 'A,B,V,G,D,E,ZH,Z,I,Y,K,L,M,N,O,P,R,S,T,U,F,H,TS,CH,SH,SHT,A,A,YU,YA'.split(',');
    if(cyrillic.length !== latin.length) {
        throw new Error('Cyrillic and Latin arrays must be of the same length');
    }

    return text.split('').map(char => {
        const isLowerCase = char === char.toLowerCase();
        const index = cyrillic.indexOf(char.toUpperCase());
        if(index === -1) {
            return char;
        }
        const latinChar = latin[index];
        return isLowerCase ? latinChar.toLowerCase() : latinChar;
    }).join('');
}

function validate_stop_names(stop) {
    const tags = stop.tags;
    if(tags['short_name']) {
        console.warn(`Stop with ref ${tags.ref} has a short_name tag without language specification. https://www.osm.org/${stop.type}/${stop.id}`);
    }
    if(tags['full_name']) {
        console.warn(`Stop with ref ${tags.ref} has a full_name tag without language specification. https://www.osm.org/${stop.type}/${stop.id}`);
    }
    const supported_languages = ['bg', 'en'];
    const keys = Object.keys(tags);
    const names = new Set(keys.filter(key => key === 'name' || key.startsWith('name:')));
    const short_names = new Set(keys.filter(key => key.startsWith('short_name:')));
    const full_names = new Set(keys.filter(key => key.startsWith('full_name:')));
    const ignore_keys = new Set(['int_name', 'old_name', 'noname']);
    const other_names = new Set(keys.filter(key => (key.includes('name') && !short_names.has(key) && !full_names.has(key) && !names.has(key) && !ignore_keys.has(key))));

    if(other_names.size > 0) {
        // console.warn(`Stop with ref ${tags.ref} has unsupported name tags: ${[...other_names].join(', ')}. https://www.osm.org/${stop.type}/${stop.id}`);
    }
    const unsupported_languages = new Set([...names, ...short_names, ...full_names].map(key => key.includes(':') ? key.split(':')[1] : 'bg').filter(lang => !supported_languages.includes(lang)));
    if(unsupported_languages.size > 0) {
        console.warn(`Stop with ref ${tags.ref} has unsupported languages in name tags: ${[...unsupported_languages].join(', ')}. https://www.osm.org/${stop.type}/${stop.id}`);
    }
}
async function fetch_osm_stops() {
    const elements = osm_stops_types.map(type => `node[${type.type}=yes][public_transport=${type.public_transport}][ref][network="${osm_network_name}"];`).join('');
    const query = '[out:json][timeout:25];'
    + `(${elements});`
    + 'out geom;';
    const req = await fetch("https://overpass-api.de/api/interpreter", {
		"body": `data=${encodeURIComponent(query)}`,
		"method": "POST",
		"headers": {
			"Referer": "https://overpass-turbo.eu/",
			"User-Agent": "github/Dimitar5555/sofiatraffic-schedules"
		}
	})
    .then(response => response.json())
    .then(data => data.elements)
    .then(stops => stops.map((stop) => {
        validate_stop_names(stop);
        const { tags, lat, lon } = stop;
        const new_stop = {
            code: tags.ref,
            coords: round_stop_coords(lat, lon),
            names: {
                bg: tags.name || '',
                en: tags['name:en'] || '',
            }
        };
        if(tags['subway'] && tags['subway'] === 'yes') {
            new_stop.code = `M${new_stop.code}`;
        }
        else {
            new_stop.code = new_stop.code.padStart(4, '0');
        }
        if(!tags['name:en']) {
            new_stop.names.en = transliterate(new_stop.names.bg);
        }
        if(tags['short_name:bg']) {
            new_stop.names.bg_short = tags['short_name:bg'];
        }
        if(tags['short_name:en']) {
            new_stop.names.en_short = tags['short_name:en'];
        }
        if(tags['full_name:bg']) {
            new_stop.names.bg_full = tags['full_name:bg'];
        }
        if(tags['full_name:en']) {
            new_stop.names.en_full = tags['full_name:en'];
        }
        if(tags.request_stop === 'yes') {
            new_stop.request_stop = true;
        }
        if(tags?.local_ref) {
            new_stop.local_ref = tags.local_ref;
        }
        if(tags['local_ref:metro']) {
            new_stop.metro_ref = tags['local_ref:metro'];
        }
        return new_stop;
    }));
    return req;
}

async function fetch_sumc_stops() {
    const stops_csv = fs.readFileSync('./gtfs/stops.txt', 'utf-8');
    const stops = (await csvtojson().fromString(stops_csv))
    .map(({ stop_id, stop_code, stop_lat, stop_lon, stop_name }) => ({
        code: stop_id.startsWith('M') ? stop_id : stop_code.padStart(4, '0'),
        coords: round_stop_coords(stop_lat, stop_lon),
        names: {
            bg: stop_name,
            en: transliterate(stop_name),
        },
    }));
    return stops;
}

function merge_stops(osm_stops, sumc_stops) {
    const merged_stop = new Map();
    const osm_order = {
        'stop_position': 1,
        'platform': 2
    }
    osm_stops.sort((a, b) => {
        const a_type = a.tags && a.tags['public_transport'] ? a.tags['public_transport'] : '';
        const b_type = b.tags && b.tags['public_transport'] ? b.tags['public_transport'] : '';
        return (osm_order[a_type] || 999) - (osm_order[b_type] || 999);
    });
    osm_stops.forEach(stop => {
        if(merged_stop.has(stop.code)) {
            console.warn(`Duplicate stop code ${stop.code} found in OSM data. https://www.osm.org/${stop.type}/${stop.id}`);
        }
        merged_stop.set(stop.code, stop);
    });
    for(const sumc_stop of sumc_stops) {
        const existing_stop = merged_stop.get(sumc_stop.code);
        if(existing_stop) {
            if(!existing_stop.names.en) {
                existing_stop.names.en = transliterate(existing_stop.names.bg);
            }
        }
        else {
            merged_stop.set(sumc_stop.code, sumc_stop);
        }
    }
    return Array.from(merged_stop.values());
}

async function run() {
    console.log('Fetching OSM stops...');
    const osm_stops = await fetch_osm_stops();
    console.log('Fetching SUMC stops...');
    const sumc_stops = await fetch_sumc_stops();
    console.log('Merging stops...');
    const merged_stops = merge_stops(osm_stops, sumc_stops);
    fs.writeFileSync('./data/stops.json', JSON.stringify(merged_stops, null, 2), 'utf-8');
}

await run();
