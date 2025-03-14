const files_to_cache = [
	'./',
	'index.html',
	'manifest.json',

	'data/directions.json',
	'data/routes.json',
	'data/stop_times.json',
	'data/stops.json',
	'data/trips.json',
	'data/metadata.json',

	'js/vendor/bootstrap.bundle.min.js',
	'js/vendor/leaflet.js',
	'js/vendor/leaflet.markercluster.js',
	'js/vendor/leaflet.featuregroup.subgroup.js',

	'js/config.js',
	'js/map.js',
	'js/virtual_boards.js',
	'js/utilities.js',
	'js/app.js',
	'js/navigation.js',
	'js/schedules.js',
	'js/favourites.js',

	'i18n/bg.json',
	'i18n/en.json',

	'css/leaflet.css',
	'css/bootstrap.min.css',
	'css/bootstrap-icons.css',
	'css/style.css',
	'css/MarkerCluster.css',
	'css/MarkerCluster.Default.css',

	'fonts/SofiaSans-Bold.ttf',
	'fonts/SofiaSans-Medium.ttf',
	'fonts/SofiaSans-Regular.ttf',
	'fonts/bootstrap-icons.woff',
	'fonts/bootstrap-icons.woff2'
];
const OFFLINE_CACHE = 'pwa-assets';
/*
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
});*/

self.addEventListener('install', function(e) {
	console.log('[ServiceWorker] Install');
	e.waitUntil(
		caches
		.open(OFFLINE_CACHE)
		.then(function(cache) {
			console.log('[ServiceWorker] Caching app shell');
			return cache.addAll(files_to_cache);
		})
		.then(() => {
			console.log('[ServiceWorker] Added all files to the cache');
			return self.skipWaiting();
		})
		.catch(err => {
			console.error('[ServiceWorker] Error while adding files to the cache:' + err);
		})
	);
});

self.addEventListener('activate', function(e) {
	console.log('[ServiceWorker] Activate');
	e.waitUntil(self.clients.claim());
	/*e.waitUntil(
		caches.keys().then(function(keyList) {
			return Promise.all(keyList.map(function(key) {
				if (key !== OFFLINE_CACHE) {
					console.log('[ServiceWorker] Removing old cache', key);
					return caches.delete(key);
				}
			}));
		}).then(() => clients.claim())
	);*/
});

self.addEventListener('fetch', function(e) {
	const url = new URL(e.request.url);
	
	console.log(url.origin, location.origin);
	console.log(url, location);
	if (url.origin === location.origin) {
		// Handle internal requests (same origin)
		console.log('[ServiceWorker] Fetch same origin ', e.request.url);
		e.respondWith(
			fetch(e.request)
			.then(function(networkResponse) {
				return networkResponse;
			})
			.catch(() => {
				return caches
				.open(OFFLINE_CACHE)
				.then((cache) => cache.match(e.request));
			})
		);
	} else {
		// External request
		console.log('[ServiceWorker] Fetch external origin ', e.request.url);
		e.respondWith(
			fetch(e.request.clone())
			.then(function(networkResponse) {
				return networkResponse;
			})
			.catch(function(error) {
				console.error('[ServiceWorker] Fetch failed for external request', error);
				// Return a fallback response or a generic error message
				return new Response('External request failed', {
					status: 502,
					statusText: 'Bad Gateway',
				});
			})
		);
	}
});

/*async function is_metadata_up_to_date(){
	var local_data_version = fetch_file_locally('data/metadata.json').then(metadata => metadata.retrieval_date);
	var today = new Date().toISOString().split('T')[0];
	return today==local_data_version;
}
function fetch_file_locally(url){
	return (() => caches.open("pwa-assets").then(response => response.match(url, {ignoreSearch: true})));
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
	return caches.open(OFFLINE_CACHE)
	.then(cache => {
		cache.addAll(files_to_cache);
	});
}*/
