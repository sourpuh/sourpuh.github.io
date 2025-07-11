import { deserializeWaymarkPresetV1 } from "./wms_importer.js";
import { loadGameData } from "./data_loader.js";
import { renderWaymarksOnMaps } from "./map_renderer.js";

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const nameParam = urlParams.get('preset');

    if (nameParam) {
        const b64String = nameParam.replace(/-/g, '+').replace(/_/g, '/');
        const decodedString = atob(b64String.substring("wms1".length));
        const byteArray = Uint8Array.from(decodedString, char => char.charCodeAt(0));

        let preset;
        try {
            preset = deserializeWaymarkPresetV1(byteArray);
        } catch (error) {
            console.error("Failed to deserialize waymark preset:", error);
            return;
        }

        const paramValueElement = document.getElementById('presetName');
        if (paramValueElement) {
            paramValueElement.textContent = preset.Name;
        }

        try {
            const { territorySheet, mapSheet, contentTypeSheet, expansionSheet } = await loadGameData();

            const territoryInfo = territorySheet[preset.TerritoryId.toString()];
            if (!territoryInfo) {
                console.error(`Territory information for ID ${preset.TerritoryId} not found.`);
                return;
            }

            const expansion = expansionSheet[territoryInfo.Expansion.toString()];
            const contenttype = contentTypeSheet[territoryInfo.ContentType.toString()];

            const locationNameElement = document.getElementById('locationName');
            if (locationNameElement) {
                locationNameElement.textContent = `${expansion} > ${contenttype} > ${territoryInfo.Name}`;
            }

            renderWaymarksOnMaps(preset, territoryInfo, mapSheet, 'waymarkMapsContainer');

        } catch (error) {
            console.error('Error loading game data or rendering maps:', error);
        }

    } else {
        const summary = document.getElementById('summary');
        if (summary) summary.style.display = 'none';
        const installGuide = document.getElementById('installGuide');
        if (installGuide) installGuide.open = true;
    }

    const copyButton = document.getElementById('copyPresetBtn');
    const copyMessage = document.getElementById('copyMessage');
    if (copyButton && copyMessage) {
        copyButton.addEventListener('click', () => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(window.location.href)
                    .then(() => {
                        copyMessage.textContent = 'Copied to clipboard!';
                        copyMessage.classList.remove('hidden');
                        setTimeout(() => {
                            copyMessage.classList.add('hidden');
                        }, 3000);
                    })
                    .catch(err => {
                        copyMessage.textContent = 'Failed to copy!';
                        copyMessage.classList.remove('hidden');
                        copyMessage.classList.add('text-red-700');
                        setTimeout(() => {
                            copyMessage.classList.add('hidden');
                            copyMessage.classList.remove('text-red-700');
                        }, 3000);
                    });
            }
        });
    }
});