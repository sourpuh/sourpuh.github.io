import AABB from "./aabb.js";
import Waymark from "./waymark.js";
import { getWaymarkClass, getWaymarkSize, getWaymarkBorderRadius } from "./waymark_helpers.js";

export function renderWaymarksOnMaps(preset, territoryInfo, mapSheet, parentElementId = 'waymarkMapsContainer') {
    const parentContainer = document.getElementById(parentElementId);
    parentContainer.innerHTML = '';

    // Group map ranges by MapId and store their individual AABBs
    // Map<MapId, { mapData: object, individualAABBs: Array<AABB>, mapRanges: Array<object> }>
    const uniqueMapsData = new Map();

    territoryInfo.MapRanges.forEach(mapRange => {
        const mapId = mapRange.MapId;
        const map = mapSheet[mapId.toString()];

        if (!map) {
            console.warn(`Map with ID ${mapId} not found in mapSheet, skipping range.`);
            return;
        }

        // Create an AABB for the current mapRange
        const currentRangeAABB = new AABB(mapRange.Min, mapRange.Max);

        if (!uniqueMapsData.has(mapId)) {
            uniqueMapsData.set(mapId, {
                mapData: map,
                individualAABBs: [currentRangeAABB], // Store individual AABBs in an array
            });
        } else {
            // If MapId already exists, add the new individual AABB to the array
            const existingData = uniqueMapsData.get(mapId);
            existingData.individualAABBs.push(currentRangeAABB);
        }
    });

    let mapRenderIndex = 0; // Use a single index for unique map elements on the page

    uniqueMapsData.forEach((mapEntry, mapId) => {
        const map = mapEntry.mapData;
        const waymarksOnThisMapBB = new AABB();
        const waymarksOnThisMap = new Set();

        for (const waymark of Object.values(Waymark)) {
            if (preset.MarkerPositions.has(waymark)) {
                const wPos = preset.MarkerPositions.get(waymark);

                for (const aabb of mapEntry.individualAABBs) {
                    if (aabb.contains(wPos)) {
                        waymarksOnThisMapBB.add(wPos);
                        waymarksOnThisMap.add(waymark);
                        break;
                    }
                }
            }
        }

        if (waymarksOnThisMap.size == 0) {
            return;
        }

        const mapContainer = document.createElement('div');
        mapContainer.classList.add('map-item');
        mapContainer.innerHTML = `
            <div class="map-wrapper">
                <div id="waymarkMap-${mapRenderIndex}" class="waymark-map">
                    <img id="waymarkMapImage-${mapRenderIndex}" alt="Map Image" class="waymark-map-image">
                </div>
            </div>
        `;
        parentContainer.appendChild(mapContainer);

        const mapImageElement = document.getElementById(`waymarkMapImage-${mapRenderIndex}`);
        const mapElement = document.getElementById(`waymarkMap-${mapRenderIndex}`);

        mapImageElement.onload = function() {
            // Sub-pixel rendered dimensions for final pixel placement; the IDL .width
            // attribute is integer-rounded, which drifts visibly at high zoom.
            const imgRect = mapImageElement.getBoundingClientRect();
            const imgW = imgRect.width;
            const imgH = imgRect.height;
            // World->normalized-texture conversion uses the natural texture size, not the
            // rendered size, so waymark scale stays consistent with the image's pixel grid
            // even when CSS shrinks the image (e.g. Tailwind max-width: 100%).
            const naturalW = mapImageElement.naturalWidth;

            const effectiveBoundingBoxSize = Math.max(waymarksOnThisMapBB.getLongAxisLength(), 30);
            const waymarksCenter = waymarksOnThisMapBB.getCenter();
            const isDefaultMap = territoryInfo.IsDefault;
            // World units to normalized texture units
            const mapScaleFactor = isDefaultMap
                ? 0.5 / effectiveBoundingBoxSize
                : (map.SizeFactor / 100) / naturalW;
            const projectionCenterX = isDefaultMap ? waymarksCenter.X : map.Center.X;
            const projectionCenterY = isDefaultMap ? waymarksCenter.Z : map.Center.Y;

            const waymarkBgItems = [];

            // Append waymarks to the current map element
            for (const waymark of waymarksOnThisMap) {
                const position3d = preset.MarkerPositions.get(waymark);

                const x = (position3d.X - projectionCenterX) * mapScaleFactor + 0.5;
                const y = (position3d.Z - projectionCenterY) * mapScaleFactor + 0.5;
                const px = imgW * x;
                const py = imgH * y;
                // Visible bg size (in CSS px) at panzoom scale = 1.
                const baseSize = getWaymarkSize(waymark) * imgW * mapScaleFactor;

                const waymarkBgItem = document.createElement('div');
                waymarkBgItem.classList.add("waymark", getWaymarkClass(waymark));
                waymarkBgItem.style.borderWidth = '2px';
                waymarkBgItem.style.borderRadius = getWaymarkBorderRadius(waymark);
                waymarkBgItem.style.left = '0';
                waymarkBgItem.style.top = '0';
                waymarkBgItem.style.transformOrigin = '0 0';
                waymarkBgItem.dataset.px = px;
                waymarkBgItem.dataset.py = py;
                waymarkBgItem.dataset.baseSize = baseSize;
                mapElement.appendChild(waymarkBgItem);
                waymarkBgItems.push(waymarkBgItem);

                const waymarkItem = document.createElement('img');
                waymarkItem.classList.add('image-overlay');
                waymarkItem.src = `./assets/icons/${waymark}.png`;
                waymarkItem.style.left = '0';
                waymarkItem.style.top = '0';
                waymarkItem.dataset.px = px;
                waymarkItem.dataset.py = py;
                mapElement.appendChild(waymarkItem);
            }

            const initialZoom = isDefaultMap
                ? 1
                : Math.max(1, Math.min(1000, 0.6 / (effectiveBoundingBoxSize * mapScaleFactor)));
            const panzoom = Panzoom(mapElement, {
                maxScale: 1000,
                startScale: initialZoom,
            });
            mapElement.parentElement.addEventListener('wheel', panzoom.zoomWithWheel);

            const xOffset = -(imgW * ((waymarksCenter.X - projectionCenterX) * mapScaleFactor + 0.5) - (imgW / 2));
            const yOffset = -(imgH * ((waymarksCenter.Z - projectionCenterY) * mapScaleFactor + 0.5) - (imgH / 2));
            setTimeout(() => panzoom.pan(xOffset, yOffset));

            const iconOverlays = mapElement.querySelectorAll('.image-overlay');
            function updateOverlays() {
                const currentScale = panzoom.getScale();
                const iconScale = 0.4 / currentScale;
                iconOverlays.forEach(overlay => {
                    const px = parseFloat(overlay.dataset.px);
                    const py = parseFloat(overlay.dataset.py);
                    const halfW = (overlay.naturalWidth || 0) / 2;
                    const halfH = (overlay.naturalHeight || 0) / 2;
                    overlay.style.transform = `translate(${px}px, ${py}px) scale(${iconScale}) translate(${-halfW}px, ${-halfH}px)`;
                });
                // Counter-scale by 1/currentScale so the bg element renders at native CSS
                // pixels regardless of panzoom — keeps the 2px border at a constant integer
                // CSS pixel value (no sub-pixel rounding bouncing).
                const counterScale = 1 / currentScale;
                waymarkBgItems.forEach(el => {
                    const px = parseFloat(el.dataset.px);
                    const py = parseFloat(el.dataset.py);
                    const baseSize = parseFloat(el.dataset.baseSize);
                    const bgSize = baseSize * currentScale;
                    const bgHalf = bgSize / 2;
                    el.style.width = bgSize + 'px';
                    el.style.height = bgSize + 'px';
                    el.style.transform = `translate(${px}px, ${py}px) scale(${counterScale}) translate(${-bgHalf}px, ${-bgHalf}px)`;
                });
            }

            iconOverlays.forEach(overlay => {
                overlay.addEventListener('load', updateOverlays);
            });

            mapElement.addEventListener('panzoomchange', updateOverlays);
            updateOverlays();
        };
        mapImageElement.src = `./assets/maps/${map.Texture}.png`;
        mapRenderIndex++;
    });
}