const files_to_cache = [
	'index.html',
	'manifest.json',

	'data/directions.json',
	'data/routes.json',
	'data/stop_times.json',
	'data/stops.json',
	'data/trips.json',
	'data/metadata.json',

	'js/bootstrap.bundle.min.js',
	'js/leaflet.js',
	'js/leaflet.markercluster.js',
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
const cache_name = 'pwa-assets';
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
		caches.open(cache_name).then(function(cache) {
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
				if (key !== cache_name) {
					console.log('[ServiceWorker] Removing old cache', key);
					return caches.delete(key);
				}
			}));
		}).then(() => clients.claim())
	);
	);*/
});

self.addEventListener('fetch', function(e) {
	console.log('[ServiceWorker] Fetch', e.request.url);
	const url = new URL(e.request.url);

	// Handle internal requests (same origin)
	if (url.origin === location.origin) {
		e.respondWith(
			fetch(e.request).then(function(networkResponse) {
				return networkResponse;
			})
			.catch(() => {
				caches.match(e.request).then(function(response) {
					return response;
				});
			})
		);
	}
	else {
		// External request
		e.respondWith(
			fetch(e.request).then(function(networkResponse) {
				return networkResponse;
			}).catch(function(error) {
				console.error('[ServiceWorker] Fetch failed; returning fallback content', error);
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
	return caches.open(cache_name)
	.then(cache => {
		cache.addAll(files_to_cache);
	});
}*/