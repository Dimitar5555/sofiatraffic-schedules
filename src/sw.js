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
			if(await is_data_stale()) {
				console.log('[ServiceWorker] Clearing old cache');
				const keys = await cache.keys();
				for(const key of keys) {
					await cache.delete(key);
				}
			}
			console.log('[ServiceWorker] Caching app shell');
			const unduplicated_set = new Set(manifest);
			unduplicated_set.add('./');
			const unduplicated = Array.from(unduplicated_set);
			console.log(unduplicated);
			return cache.addAll(unduplicated);
		})
		.then(function() {
			console.log('[ServiceWorker] All required resources have been cached');
		})
		.catch(function(error) {
			console.error('[ServiceWorker] Failed to cache', error);
		});
}

function is_data_stale() {
	return caches
		.open(OFFLINE_CACHE)
		.then(function(cache) {
			return cache.match(new URL('../data/metadata.json', import.meta.url).href);
		})
		.then(function(response) {
			if(!response) {
				return true;
			}
			return response.json();
		})
		.then(function(data) {
			const today_iso = (new Date()).toISOString().split('T')[0];
			if(data.retrieval_date < today_iso) {
				return true;
			}
			return false;
		});
}

function install() {
	return cache_all();
}

addEventListener('install', e => e.waitUntil(install()));

async function activate() {
	if(await is_data_stale()) {
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
