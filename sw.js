self.addEventListener('fetch', function (event) {
	event.respondWith(
		// Try the cache
		caches
		.match(event.request)
		.then(function (response) {
			// Fall back to network
			return response || fetch(event.request);
		})
	);
});