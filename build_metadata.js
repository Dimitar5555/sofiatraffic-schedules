import fs from "fs";
import crypto from "crypto";

function generate_metadata() {
    let metadata = {
        app_version: '2025-01-31',
        retrieval_date: new Date().toISOString().split('T')[0],
        hashes: {}
    };
    for(const file of ['directions', 'routes', 'stops', 'stop_times', 'trips']) {
        const file_content = fs.readFileSync(`./docs/data/${file}.json`);
        const hash = crypto.createHash('sha256').update(file_content).digest('hex');
        metadata.hashes[file] = hash;
    }

    fs.writeFileSync('docs/data/metadata.json', JSON.stringify(metadata));
}