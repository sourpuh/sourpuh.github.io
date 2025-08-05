import { loadGameData } from "./data_loader.js";
import { importPreset } from "./wms_importer.js";
import { renderWaymarksOnMaps } from "./map_renderer.js";

var gameDataPromise = loadGameData();

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const presetParam = urlParams.get('preset');

    if (presetParam) {
        const presetBase64 = presetParam.replace(/-/g, '+').replace(/_/g, '/');
        const preset = importPreset(presetBase64);

        const presetNameElement = document.getElementById('presetName');
        if (presetNameElement) {
            presetNameElement.textContent = preset.Name;
        }

        try {
            const { territorySheet, mapSheet, contentTypeSheet, expansionSheet } = await gameDataPromise;

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