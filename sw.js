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
	if(['metadata.json', 'stops.json', 'schedule.json'].indexOf(requested_file)!==-1){
		//always get metadata from server
		check_metadata_validity()
		.catch((error) => {
			console.error(error);
			console.log('Updating metadata...');
			return update_file('data/metadata.json', event)
			.then(() => {
				return update_data_files();
			})
		})
		.then(() => {
			console.log('Metadata is up to date!');
			event.respondWith(caches.match(event.request));
		});
	}
	else{
		//all other files can be retrieved from cache
		event.respondWith(caches.match(event.request) || fetch(event.request));
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
function check_metadata_validity(){
	return caches.match('data/metadata.json')
	.then(data => data?data.text():false)
	.then(data => JSON.parse(data))
	.then(metadata => {
		if(!metadata){
			return Promise.reject("Metadata is missing!");
		}
		var date_diffrence = (new Date()-new Date(metadata.retrieval_date))/1000/60/60/24;
		if(date_diffrence==1){
			if(today.getUTCHours()==2 && today.getMinutes()>=30 || today.getUTCHours()>2){
				return Promise.reject("Metadata is outdated!");
			}
			return Promise.resolve();
		}
		else if(date_diffrence>1){
			return Promise.reject("Metadata is outdated!");
		}
		return Promise.resolve();
	});
}
function update_data_files(){
	return caches.match('data/metadata.json')
	.then(cache => {
		var old_cache = JSON.parse(cache);
		check_metadata_validity()
		.catch(() => {
			//metadata is out of date
			return update_file('data/metadata.json');
		})
		.then(() => {
			//compare hashes
			var new_cache = JSON.parse(caches.match('data/metadata.json'));
			var promises = [];
			if(old_cache.stops_hash!==new_cache.stops_hash){
				//retrieve stops data
				promises.push(update_file('data/stops.json'));
			}
			if(old_cache.schedule_hash!==new_cache.schedule_hash){
				//retrieve schedule data
				promises.push(update_file('data/schedule.json'));
			}
			if(old_cache.last_modification!==new_cache.last_modification){
				//retrieve js files
				files_to_cache.forEach(file => promises.push(update_file(file)));
			}
			return Promise.all(promises);
		});
	});
}
setInterval(update_data_files, 1000*60*30);