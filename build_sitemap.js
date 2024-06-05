const fs = require('fs');

function init(){
	routes = JSON.parse(fs.readFileSync('docs/data/routes.json').toString());
	trips = JSON.parse(fs.readFileSync('docs/data/trips.json').toString());
	directions = JSON.parse(fs.readFileSync('docs/data/directions.json').toString());
}
function run(){
	const site = 'https://dimitar5555.github.io/sofiatraffic-schedules/';
	var sitemap = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">'];
	routes.forEach((route, route_index) => {
		sitemap.push('<url>');
		sitemap.push(`<loc>${site}#${route.type}/${route.line}</loc>`);
		sitemap.push('<changefreq>daily</changefreq>');
		sitemap.push('<priority>0.8</priority>');
		sitemap.push('</url>');
	});
	sitemap.push('</urlset>');
	fs.writeFileSync('docs/sitemap.xml', sitemap.join('\n'));
}
init();
run();
