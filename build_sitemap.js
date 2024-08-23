const fs = require('fs');
const site = 'https://dimitar5555.github.io/sofiatraffic-schedules/';
const url_prefix = '#';

function read_file(file) {
	return JSON.parse(fs.readFileSync(`docs/data/${file}.json`).toString());
}

function init(){
	routes = read_file('routes');
	trips = read_file('trips');
	directions = read_file('directions');
	stops = read_file('stops');
}

function generate_url_entry(hash, priority, sitemap) {
	sitemap.push('<url>');
	sitemap.push(`<loc>${site}${url_prefix}${hash}/</loc>`);
	sitemap.push('<changefreq>weekly</changefreq>');
	sitemap.push(`<priority>${priority}</priority>`);
	sitemap.push('</url>');
}

function run(){
	var sitemap = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">'];
	for(const page of ['schedules', 'stops_map']) {
		generate_url_entry(`${page}`, 1, sitemap);
	}
	routes.forEach(route => {
		generate_url_entry(`${route.type}/${route.line}`, 0.7, sitemap);
	});
	
	stops.forEach(stop => {
		generate_url_entry(`stop/${stop.code}`, 0.5, sitemap);
	})

	sitemap.push('</urlset>');
	fs.writeFileSync('docs/sitemap.xml', sitemap.join('\n'));
}
init();
run();
