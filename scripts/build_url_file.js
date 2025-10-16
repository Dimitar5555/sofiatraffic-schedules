import fs from 'fs';

const routes = JSON.parse(fs.readFileSync('data/routes.json'));
const stops = JSON.parse(fs.readFileSync('data/stops.json'));

const output = [];
for(const route of routes) {
    const url = `https://dimitar5555.github.io/sofiatraffic-schedules/#!/${route.type}/${route.route_ref}`;
    output.push(`new URL(\'${url}\');\n`);
}

for(const stop of stops) {
    const url = `https://dimitar5555.github.io/sofiatraffic-schedules/#!/stop/${stop.code.toString().padStart(4, '0')}`;
    output.push(`new URL(\'${url}\');\n`);
}

fs.writeFileSync('data/url_file.js', output.join(''), 'utf-8');
