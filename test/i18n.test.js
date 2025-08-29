const master_lang = 'bg';
const languages = ['bg', 'en'];

function get_all_keys(obj) {
    const key_set = new Set();
    for (const key in obj) {
        key_set.add(key);
    }
    return key_set;
}

describe('i18n', () => {
    test('should have the same keys in all languages', () => {
        const language_data = new Map();

        languages.forEach(lang => {
            language_data.set(lang, require(`../i18n/${lang}.json`) || {});
        });
        const master_lang_set = get_all_keys(language_data.get(master_lang));
        for (const lang of languages) {
            if(lang == master_lang) continue;

            const other_lang_set = get_all_keys(language_data.get(lang));
            const symmetric_diff = master_lang_set.symmetricDifference(other_lang_set);
            expect(symmetric_diff).toEqual(new Set());
        }
    });
});