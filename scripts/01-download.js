import fs from 'fs';
import unzip from 'unzipper';

const url = 'https://gtfs.sofiatraffic.bg/api/v1/static';

export async function download() {
    const res = await fetch(url);
    if(!res.ok) {
        throw new Error(`Failed to download GTFS data: ${res.statusText}`);
    }

    const buffer = await res.arrayBuffer();
    const zip = await unzip.Open.buffer(Buffer.from(buffer));
    const ignore_files = [
        'agency.txt',
        'fare_attributes.txt',
        'feed_info.txt',
        'levels.txt',
        'pathways.txt',
        'transfers.txt',
        'shapes.txt',
        // 'translations.txt'
    ];
    for(const file of zip.files) {
        if(ignore_files.includes(file.path)) {
            continue;
        }
        const content = await file.buffer();
        fs.writeFileSync(`gtfs/${file.path}`, content);
    }
}

download();
