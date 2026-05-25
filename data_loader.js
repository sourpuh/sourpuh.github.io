export async function loadGameData() {
    const territoryPromise = fetch('./assets/territory_sheet.json').then(sheet => sheet.json());
    const mapPromise = fetch('./assets/map_sheet.json').then(sheet => sheet.json());
    const contentTypePromise = fetch('./assets/contenttype_sheet.json').then(sheet => sheet.json());
    const expansionPromise = fetch('./assets/expansion_sheet.json').then(sheet => sheet.json());
    const customMapPromise = fetch('./assets/custom_map.json')
        .then(r => r.ok ? r.json() : {})
        .catch(() => ({}));

    const [territorySheet, mapSheet, contentTypeSheet, expansionSheet, customMapSheet] = await Promise.all([
        territoryPromise,
        mapPromise,
        contentTypePromise,
        expansionPromise,
        customMapPromise
    ]);

    return { territorySheet, mapSheet, contentTypeSheet, expansionSheet, customMapSheet };
}
