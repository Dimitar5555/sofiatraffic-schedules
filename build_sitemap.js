const fs = require('fs');
const site = 'https://dimitar5555.github.io/sofiatraffic-schedules/';

function read_file(file) {
	return JSON.parse(fs.readFileSync(`docs/data/${file}.json`).toString());
}

function init(){
	routes = read_file('routes');
	trips = read_file('trips');
	directions = read_file('directions');
	stops = read_file('stops');
}

function generate_url_entry(hash, sitemap) {
	sitemap.push('<url>');
	sitemap.push(`<loc>${site}#${hash}/</loc>`);
	sitemap.push('<changefreq>daily</changefreq>');
	sitemap.push('<priority>0.8</priority>');
	sitemap.push('</url>');
}

function run(){
	var sitemap = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">'];
	
	routes.forEach(route => {
		generate_url_entry(`${url_prefix}${route.type}/${route.line}`, sitemap);
	});
	
	stops.forEach(stop => {
		generate_url_entry(`${url_prefix}stop/${stop.code}`, sitemap);
	})

	sitemap.push('</urlset>');
	fs.writeFileSync('docs/sitemap.xml', sitemap.join('\n'));
}
init();
run();
