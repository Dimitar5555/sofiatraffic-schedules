import { manifest } from '@parcel/service-worker';

const OFFLINE_CACHE = 'pwa-assets';

function cache_all() {
	return caches
		.open(OFFLINE_CACHE)
		.then(async function(cache) {
			if(!navigator.onLine) {
				console.log('[ServiceWorker] Offline, skipping cache update.');
				return;
			}
			console.log('[ServiceWorker] Clearing old cache');
			await cache.keys().then(function(keys) {
				for(let key of keys) {
					cache.delete(key);
				}
			});
			console.log('[ServiceWorker] Caching app shell');
			return await cache.addAll(manifest);
		})
		.catch(function(error) {
			console.error('[ServiceWorker] Failed to cache', error);
		});
}

async function is_data_fresh() {
	return await caches
		.open(OFFLINE_CACHE)
		.then(function(cache) {
			return cache.match('data/metadata.json');
		})
		.then(function(response) {
			if(!response) {
				return false;
			}
			return response.json();
		})
		.then(function(data) {
			const today_iso = (new Date()).toISOString().split('T')[0];
			if(data.retrieval_date < today_iso) {
				return false;
			}
			return true;
		});
}

async function install() {
	cache_all();
}

addEventListener('install', e => e.waitUntil(install()));

async function activate() {
	if(!(await is_data_fresh())) {
		await cache_all();
	}
	await self.clients.claim();
	console.log('[ServiceWorker] Activated');
}

addEventListener('activate', e => e.waitUntil(activate()));

self.addEventListener('fetch', function(e) {
	const url = new URL(e.request.url);
	
	if(url.origin === location.origin) {
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
	}
	else {
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
