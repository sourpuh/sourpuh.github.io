import Waymark from "./waymark.js";

const WaymarkNames = {
    [Waymark.A]: "A",
    [Waymark.B]: "B",
    [Waymark.C]: "C",
    [Waymark.D]: "D",
    [Waymark.One]: "One",
    [Waymark.Two]: "Two",
    [Waymark.Three]: "Three",
    [Waymark.Four]: "Four",
};

export function exportPreset(preset, contentFinderConditionId) {
    const result = {
        Name: preset.Name || "Exported",
        MapID: contentFinderConditionId,
    };

    for (const [id, name] of Object.entries(WaymarkNames)) {
        const waymarkId = Number(id);
        const position = preset.MarkerPositions.get(waymarkId);
        if (position !== undefined) {
            result[name] = {
                X: position.X,
                Y: position.Y,
                Z: position.Z,
                Active: true,
            };
        }
    }

    return JSON.stringify(result);
}
