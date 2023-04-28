const files_to_cache = [
	'',
	'manifest.json',
	'data/schedule.json',
	'data/stops.json',
	'data/metadata.json',
	'js/app.js',
	'js/schedules.js',
	'js/favourites.js',
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
	populate_cache();
});
self.addEventListener('fetch', function (event) {
	var requested_file = event.request.url.split('/');
	requested_file = requested_file[requested_file.length-1];

	if(requested_file.indexOf('metadata.json')!==-1){
		if(!check_metadata_freshness()){
			fetch_file(requested_file);
		}
	}

	if(requested_file.indexOf('?force_update')!==-1){
		fetch_file(`data/${requested_file.split('?')[0]}`, event);
	}
	else{
		fetch_file(event.request, event);
	}
});
async function check_metadata_freshness(){
	var local_app_version = await fetch_file_locally('data/metadata.json').then(text => JSON.parse(text)).then(data => data.app_version);
	var current_app_version = await fetch_file('data/metadata.json').then(text => JSON.parse(text)).then(data => data.app_version);
	return local_app_version!==current_app_version;
}
function fetch_file_locally(url){
	return (() => caches.open("pwa-assets").then(response => response.match(url)))
}
function fetch_file(url, event=false){
	return fetch(url)
	.then(response => {
		caches.open("pwa-assets")
		.then(cache => {
			cache.put(url, response);
		});
		if(event){
			event.respondWith(response);
		}
	})
	.catch(() => fetch_file_locally(url));
}
function clear_cache(){
	return caches.keys()
	.then(function(keyList) {
		return Promise.all(keyList.map(function(key) {
			return caches.delete(key);
		}));
	})
}
function populate_cache(){
	return caches.open("pwa-assets")
	.then(cache => {
		cache.addAll(files_to_cache);
	});
}