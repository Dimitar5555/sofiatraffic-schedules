const master_lang = 'bg';
const languages = ['en'];

function get_all_keys(obj) {
    const key_set = new Set();
    for (const key in obj) {
        key_set.add(key);
    }
    return key_set;
}

describe('i18n', () => {
    test('should have the same keys in all languages', () => {
        const master_lang_data = require(`../docs/i18n/${master_lang}.json`);
        const master_lang_set = get_all_keys(master_lang_data);
        for (const lang of languages) {
            const data = require(`../docs/i18n/${lang}.json`) || {};
            const lang_set = get_all_keys(data);
            const symmetric_diff = master_lang_set.symmetricDifference(lang_set);
            expect(symmetric_diff).toEqual(new Set());
        }
    });
});