import fs from "fs";
const site = 'https://dimitar5555.github.io/sofiatraffic-schedules/';
const url_prefix = '?';

function read_file(file) {
	return JSON.parse(fs.readFileSync(`docs/data/${file}.json`).toString());
}

function init(){
	let routes = read_file('routes');
	let trips = read_file('trips');
	let directions = read_file('directions');
	let stops = read_file('stops');
	run(routes, trips, directions, stops);
}

function generate_url_entry(query_string, priority, sitemap) {
	sitemap.push('<url>');
	sitemap.push(`<loc>${site}${url_prefix}${query_string}</loc>`.replace(/&/g, '&amp;'));
	sitemap.push('<changefreq>weekly</changefreq>');
	sitemap.push(`<priority>${priority}</priority>`);
	sitemap.push('</url>');
}

function run(routes, trips, directions, stops){
	var sitemap = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">'];
	for(const page of ['schedules', 'stops_map']) {
		generate_url_entry(`type=${page}`, 1, sitemap);
	}
	routes.forEach(route => {
		generate_url_entry(`type=${route.type}&route=${route.route_ref}`, 0.7, sitemap);
	});
	
	stops.forEach(stop => {
		generate_url_entry(`type=stop&code=${stop.code}`, 0.5, sitemap);
	})

	sitemap.push('</urlset>');
	fs.writeFileSync('docs/sitemap.xml', sitemap.join('\n'));
}
init();
