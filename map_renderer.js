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
            const effectiveBoundingBoxSize = Math.max(waymarksOnThisMapBB.getLongAxisLength(), 30);
            const mapScaleFactor = (map.SizeFactor / 100) / mapImageElement.naturalWidth; // World units to normalized texture units

            // Append waymarks to the current map element
            for (const waymark of waymarksOnThisMap) {
                const position3d = preset.MarkerPositions.get(waymark);

                const extraScale = 10;
                const scale = extraScale * mapImageElement.width * mapScaleFactor;

                const x = (position3d.X - map.Center.X) * mapScaleFactor + 0.5;
                const y = (position3d.Z - map.Center.Y) * mapScaleFactor + 0.5;

                const waymarkBgItem = document.createElement('div');
                waymarkBgItem.classList.add("waymark", getWaymarkClass(waymark));
                waymarkBgItem.style.width = getWaymarkSize(waymark) * scale + "px";
                waymarkBgItem.style.height = getWaymarkSize(waymark) * scale + "px";
                waymarkBgItem.style.borderRadius = getWaymarkBorderRadius(waymark);
                waymarkBgItem.style.left = `${mapImageElement.width * x}px`;
                waymarkBgItem.style.top = `${mapImageElement.height * y}px`;
                waymarkBgItem.style.transform = `translate(-50%, -50%) scale(${1/extraScale})`;
                mapElement.appendChild(waymarkBgItem);

                const waymarkItem = document.createElement('img');
                waymarkItem.classList.add('image-overlay');
                waymarkItem.src = `./assets/icons/${waymark}.png`
                waymarkItem.style.left = `${mapImageElement.width * x}px`;
                waymarkItem.style.top = `${mapImageElement.height * y}px`;
                mapElement.appendChild(waymarkItem);
            }

            const initialZoom = Math.max(1, Math.min(1000, 0.6 / (effectiveBoundingBoxSize * mapScaleFactor)));
            const panzoom = Panzoom(mapElement, {
                maxScale: 1000,
                startScale: initialZoom,
            });
            mapElement.parentElement.addEventListener('wheel', panzoom.zoomWithWheel);

            const waymarksCenter = waymarksOnThisMapBB.getCenter();
            const xOffset = -(mapImageElement.width * ((waymarksCenter.X - map.Center.X) * mapScaleFactor + 0.5) - (mapImageElement.width / 2));
            const yOffset = -(mapImageElement.height * ((waymarksCenter.Z - map.Center.Y) * mapScaleFactor + 0.5) - (mapImageElement.height / 2));
            setTimeout(() => panzoom.pan(xOffset, yOffset))

            const textOverlays = mapElement.querySelectorAll('.image-overlay');
            function updateTextOverlayScale() {
                const currentScale = panzoom.getScale();
                textOverlays.forEach(overlay => {
                    overlay.style.transform = `scale(${0.4 / currentScale}) translate(-50%, -50%)`;
                });
            }

            mapElement.addEventListener('panzoomchange', updateTextOverlayScale);
            updateTextOverlayScale();
        };
        mapImageElement.src = `./assets/maps/${map.Texture}.png`;
        mapRenderIndex++;
    });
}