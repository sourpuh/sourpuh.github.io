import AABB from "./aabb.js";
import Vector3 from "./vector3.js";
import Waymark from "./waymark.js";
import { getWaymarkClass, getWaymarkSize, getWaymarkBorderRadius } from "./waymark_helpers.js";

// Index custom_map.json by the trailing component of its Bg path
// (e.g. "ex5/01_xkt_x6/rad/x6r6/level/x6r6" -> "x6r6"), which is the same
// stem that the canonical map_sheet Texture uses with a "_NN" suffix.
function indexCustomMapsByBgLeaf(customMapSheet) {
    const idx = new Map();
    if (!customMapSheet) return idx;
    for (const entry of Object.values(customMapSheet)) {
        if (!entry || !entry.Bg) continue;
        const leaf = entry.Bg.split('/').pop();
        if (!idx.has(leaf)) idx.set(leaf, []);
        idx.get(leaf).push(entry);
    }
    return idx;
}

function customsForCanonical(canonicalTexture, customsByBgLeaf) {
    const leaf = canonicalTexture.replace(/_\d+$/, '');
    const list = customsByBgLeaf.get(leaf);
    if (!list) return [];
    return [...list].sort((a, b) => a.Texture.localeCompare(b.Texture));
}

// Split file stem on "_": first word fully uppercase ( "m6s" -> "M6S")
// Subsequent words title-cased ("desert_alt" -> "Desert Alt")
function tabLabelForCustom(customTexture) {
    const stem = customTexture.split('/').pop();
    const parts = stem.split('_');
    const head = parts[0].toUpperCase();
    const tail = parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    return [head, ...tail].join(' ');
}

function boundsAabbFromJson(bounds) {
    if (!bounds || !bounds.Min || !bounds.Max) return null;
    return new AABB(
        new Vector3(bounds.Min.X, bounds.Min.Y, bounds.Min.Z),
        new Vector3(bounds.Max.X, bounds.Max.Y, bounds.Max.Z),
    );
}

function countWaymarksInOption(option, candidateWaymarks, preset) {
    if (!option.bounds) return candidateWaymarks.size;
    let count = 0;
    for (const w of candidateWaymarks) {
        if (option.bounds.contains(preset.MarkerPositions.get(w))) count++;
    }
    return count;
}

export function renderWaymarksOnMaps(preset, territoryInfo, mapSheet, parentElementId = 'waymarkMapsContainer', customMapSheet = {}) {
    const parentContainer = document.getElementById(parentElementId);
    parentContainer.innerHTML = '';

    const customsByBgLeaf = indexCustomMapsByBgLeaf(customMapSheet);

    // Group map ranges by MapId and store their individual AABBs
    const uniqueMapsData = new Map();

    territoryInfo.MapRanges.forEach(mapRange => {
        const mapId = mapRange.MapId;
        const map = mapSheet[mapId.toString()];

        if (!map) {
            console.warn(`Map with ID ${mapId} not found in mapSheet, skipping range.`);
            return;
        }

        const currentRangeAABB = new AABB(mapRange.Min, mapRange.Max);

        if (!uniqueMapsData.has(mapId)) {
            uniqueMapsData.set(mapId, {
                mapData: map,
                individualAABBs: [currentRangeAABB],
            });
        } else {
            uniqueMapsData.get(mapId).individualAABBs.push(currentRangeAABB);
        }
    });

    let mapRenderIndex = 0;

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

        const isDefaultMap = territoryInfo.IsDefault;

        // Build the list of viewing options: customs first (preferred default
        // when present), then the canonical png as a fallback tab.
        const canonicalOption = {
            label: 'Game Map',
            src: `./assets/maps/${map.Texture}.png`,
            sizeFactor: map.SizeFactor,
            centerX: map.Center.X,
            centerY: map.Center.Y,
        };

        const customs = isDefaultMap ? [] : customsForCanonical(map.Texture, customsByBgLeaf);
        const customOptions = customs.map(c => ({
            label: tabLabelForCustom(c.Texture),
            src: `./assets/maps/${c.Texture}.webp`,
            sizeFactor: c.SizeFactor,
            centerX: c.Center.X,
            centerY: c.Center.Y,
            bounds: boundsAabbFromJson(c.Bounds),
        }));

        // Drop any custom image whose image's bounds contains no waymarks.
        const visibleCustomOptions = customOptions.filter(opt =>
            countWaymarksInOption(opt, waymarksOnThisMap, preset) > 0
        );

        const options = visibleCustomOptions.length > 0
            ? [...visibleCustomOptions, canonicalOption]
            : [canonicalOption];

        // Per-view container: holds the (optional) tab bar and a wrapper that
        // gets fully replaced on every tab switch (clean panzoom + listener reset).
        const mapContainer = document.createElement('div');
        mapContainer.classList.add('map-item');
        parentContainer.appendChild(mapContainer);

        let tabButtons = [];
        if (options.length > 1) {
            const tabBar = document.createElement('div');
            tabBar.classList.add('map-tabs');
            options.forEach((opt, i) => {
                const tab = document.createElement('button');
                tab.classList.add('map-tab');
                if (i === 0) tab.classList.add('active');
                tab.type = 'button';
                tab.textContent = opt.label;
                tab.addEventListener('click', () => {
                    if (tab.classList.contains('active')) return;
                    tabButtons.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    renderOption(opt);
                });
                tabBar.appendChild(tab);
                tabButtons.push(tab);
            });
            mapContainer.appendChild(tabBar);
        }

        const viewport = document.createElement('div');
        viewport.classList.add('map-viewport');
        mapContainer.appendChild(viewport);

        // Tracks per-view resources so we can clean up between tab switches.
        let activePanzoom = null;
        let activeWheelHandler = null;
        let activeWrapper = null;

        function renderOption(option) {
            // Tear down the previous render entirely.
            if (activePanzoom) {
                if (activeWrapper && activeWheelHandler) {
                    activeWrapper.removeEventListener('wheel', activeWheelHandler);
                }
                try { activePanzoom.destroy(); } catch (_) { /* older builds */ }
                activePanzoom = null;
                activeWheelHandler = null;
            }
            viewport.innerHTML = '';

            const wrapper = document.createElement('div');
            wrapper.classList.add('map-wrapper');
            const mapElement = document.createElement('div');
            mapElement.id = `waymarkMap-${mapRenderIndex}`;
            mapElement.classList.add('waymark-map');
            const mapImageElement = document.createElement('img');
            mapImageElement.id = `waymarkMapImage-${mapRenderIndex}`;
            mapImageElement.alt = 'Map Image';
            mapImageElement.classList.add('waymark-map-image');
            mapElement.appendChild(mapImageElement);
            wrapper.appendChild(mapElement);
            viewport.appendChild(wrapper);
            activeWrapper = wrapper;

            mapImageElement.onload = function() {
                const naturalW = mapImageElement.naturalWidth;
                const naturalH = mapImageElement.naturalHeight;

                // Width = viewport; height follows aspect. panzoom handles overflow.
                const viewportSize = viewport.clientWidth;
                const aspectImg = naturalW / naturalH;
                mapImageElement.style.width = viewportSize + 'px';
                mapImageElement.style.height = (viewportSize / aspectImg) + 'px';

                const imgRect = mapImageElement.getBoundingClientRect();
                const imgW = imgRect.width;
                const imgH = imgRect.height;

                // For options that carry a 3D bounds AABB, keep only waymarks inside that volume.
                const visibleWaymarks = new Set();
                const visibleBB = new AABB();
                for (const w of waymarksOnThisMap) {
                    const p = preset.MarkerPositions.get(w);
                    if (option.bounds && !option.bounds.contains(p)) continue;
                    visibleWaymarks.add(w);
                    visibleBB.add(p);
                }

                const hasVisible = visibleWaymarks.size > 0;
                const effectiveBoundingBoxSize = hasVisible
                    ? Math.max(visibleBB.getLongAxisLength(), 30)
                    : 30;
                const waymarksCenter = hasVisible
                    ? visibleBB.getCenter()
                    : { X: option.centerX, Y: 0, Z: option.centerY };
                // Per-axis scales for non-square textures.
                const mapScaleX = isDefaultMap
                    ? 0.5 / effectiveBoundingBoxSize
                    : (option.sizeFactor / 100) / naturalW;
                const mapScaleY = isDefaultMap
                    ? 0.5 / effectiveBoundingBoxSize
                    : (option.sizeFactor / 100) / naturalH;
                const projectionCenterX = isDefaultMap ? waymarksCenter.X : option.centerX;
                const projectionCenterY = isDefaultMap ? waymarksCenter.Z : option.centerY;

                const waymarkBgItems = [];

                for (const waymark of visibleWaymarks) {
                    const position3d = preset.MarkerPositions.get(waymark);

                    const x = (position3d.X - projectionCenterX) * mapScaleX + 0.5;
                    const y = (position3d.Z - projectionCenterY) * mapScaleY + 0.5;
                    const px = imgW * x;
                    const py = imgH * y;
                    const baseSize = getWaymarkSize(waymark) * imgW * mapScaleX;

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

                // BB targets 60% of viewport so positions match across tabs.
                const initialZoom = isDefaultMap
                    ? 1
                    : Math.min(1000, 0.6 / (effectiveBoundingBoxSize * mapScaleX));
                const panzoom = Panzoom(mapElement, {
                    maxScale: 1000,
                    startScale: initialZoom,
                });
                activePanzoom = panzoom;
                activeWheelHandler = panzoom.zoomWithWheel;
                wrapper.addEventListener('wheel', activeWheelHandler);

                const xOffset = -(imgW * ((waymarksCenter.X - projectionCenterX) * mapScaleX + 0.5) - (imgW / 2));
                const yOffset = -(imgH * ((waymarksCenter.Z - projectionCenterY) * mapScaleY + 0.5) - (imgH / 2));
                setTimeout(() => {
                    if (activePanzoom === panzoom) panzoom.pan(xOffset, yOffset);
                });

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
            mapImageElement.src = option.src;
        }

        renderOption(options[0]);
        mapRenderIndex++;
    });
}
