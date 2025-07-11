import WaymarkPreset from "./waymark_preset.js";
import BinaryReader from "./binary_reader.js";
import WaymarkMask from "./waymark_mask.js";
import Waymark from "./waymark.js";
import { calculateCrc32 } from "./crc32.js";

function deserializeDefault(reader, preset) {
    preset.TerritoryId = reader.readUInt16();
    const active = new WaymarkMask(reader.readByte());
    for (const w of Object.values(Waymark)) {
        if (active.isSet(w)) {
            preset.MarkerPositions.set(w, reader.readVector3());
        }
    }
    preset.Name = reader.readString();
}

function deserializeXZOffset(reader, preset) {
    preset.TerritoryId = reader.readUInt16();
    const active = new WaymarkMask(reader.readByte());
    const center = reader.readVector3();
    for (const w of Object.values(Waymark)) {
        if (active.isSet(w)) {
            const offset = reader.readXZVector2();
            preset.MarkerPositions.set(w, center.add(offset));
        }
    }
    preset.Name = reader.readString();
}

export function deserializeWaymarkPresetV1(b) {
    const preset = new WaymarkPreset();
    const reader = new BinaryReader(b);

    try {
        const format = reader.read7BitEncodedInt();
        if (format == 0) {
            deserializeDefault(reader, preset);
        } else if (format == 1) {
            deserializeXZOffset(reader, preset);
        } else {
            throw new Error("Unsupported preset format. " + format);
        }
        const computedChecksum = calculateCrc32(b, 0, reader.offset);
        const expectedChecksum = reader.readUInt32();
        if (computedChecksum != expectedChecksum) {
            throw new Error("Corrupt preset: checksum does not match");
        }
    } catch (e) {
        console.error("Error during deserialization:", e);
        throw e;
    }

    return preset;
}