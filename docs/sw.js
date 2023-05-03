const files_to_cache = [
	'/',
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
	if(navigator.onLine){
		populate_cache();
	}
});
self.addEventListener('fetch', function (event) {
	if(!is_metadata_up_to_date() && navigator.onLine){
		fetch_file('data/metadata.json')
		.finally(() => {
			if(is_metadata_up_to_date()){
				populate_cache();
			}
		});
	}
	var requested_file = event.request.url.split('/').reverse()[0];
	fetch_file(event.request, event);
});
async function is_metadata_up_to_date(){
	var local_data_version = fetch_file_locally('data/metadata.json').then(metadata => metadata.retrieval_date);
	var today = new Date().toISOString().split('T')[0];
	return today==local_data_version;
}
function fetch_file_locally(url){
	return (() => caches.open("pwa-assets").then(response => response.match(url)));
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