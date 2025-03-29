const master_lang = 'bg';
const languages = ['en'];

function getAllKeys(obj, prefix = '', keySet = new Set()) {
    for (const key in obj) {
        const newKey = prefix ? `${prefix}.${key}` : key; // Add prefix if it's nested
        keySet.add(newKey); // Add the key to the set
        
        // If the value is an object, recurse
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            getAllKeys(obj[key], newKey, keySet);
        }
    }
    return keySet;
}

describe('i18n', () => {
    test('should have the same keys in all languages', () => {
        const master_lang_data = require(`../docs/i18n/${master_lang}.json`);
        const master_lang_set = getAllKeys(master_lang_data);
        for (const lang of languages) {
            const data = require(`../docs/i18n/${lang}.json`) || {};
            const lang_set = getAllKeys(data);
            const symmetric_diff = master_lang_set.symmetricDifference(lang_set);
            expect(symmetric_diff).toEqual(new Set());
        }
    });
});