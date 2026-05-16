import fs from "fs";
import crypto from "crypto";

let metadata = {
    app_version: '2026-05-15',
    retrieval_date: new Date().toISOString().split('T')[0],
    hashes: {}
};

for(const file of ['directions', 'routes', 'stops', 'stop_times', 'trips']) {
    const file_content = fs.readFileSync(`./data/${file}.json`);
    const hash = crypto.createHash('sha256').update(file_content).digest('hex');
    metadata.hashes[file] = hash;
}

fs.writeFileSync('./data/metadata.json', JSON.stringify(metadata, null, 2) + '\n', 'utf-8');
