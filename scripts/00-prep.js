import fs from 'fs'

const recreate_folders = ['gtfs', 'data'];
for(const folder of recreate_folders) {
    const path = `./${folder}`;
    if(fs.existsSync(path)) {
        fs.rmSync(path, { recursive: true });
    }
    fs.mkdirSync(path);
}