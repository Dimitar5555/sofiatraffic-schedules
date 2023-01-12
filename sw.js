const files_to_cache = [
	'',
	'data/schedule.json',
	'data/stops.json',
	'data/metadata.json',
	'js/app.js',
	'js/schedules.js',
	'js/favourite_stops.js',
	'js/bootstrap.bundle.min.js',
	'i18n/bg.json',
	'i18n/en.json',
	'css/bootstrap.min.css',
	'css/bootstrap-icons.css',
	'css/style.css',
	'fonts/SofiaSans-Bold.ttf',
	'fonts/SofiaSans-Medium.ttf',
	'fonts/SofiaSans-Regular.ttf',
	'fonts/bootstrap-icons.woff',
	'fonts/bootstrap-icons.woff2'
];
self.addEventListener('install', () => {
	caches.open("pwa-assets")
	.then(cache => {
		cache.addAll(files_to_cache);
	});
});
self.addEventListener('fetch', function (event) {
	var requested_file = event.request.url.split('/');
	requested_file = requested_file[requested_file.length-1];
	if(requested_file.indexOf('metadata.json')!==-1){
		update_file('data/metadata.json', event);
	}
	if(requested_file.indexOf('?force_update')!==-1){
		update_file(`data/${requested_file.split('?')[0]}`, event);
	}
	else{
		event.respondWith(caches.match(event.request) || update_file(event.request, event));
	}
});
function update_file(url, event=false){
	return fetch(url)
	.then(response => {
		caches.open("pwa-assets")
		.then(cache => {
			cache.put(url, response);
		});
		if(event){
			event.respondWith(response);
		}
	});
}