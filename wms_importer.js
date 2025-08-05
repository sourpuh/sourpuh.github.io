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

function deserializeWaymarkPresetV1(b) {
    const preset = new WaymarkPreset();
    const reader = new BinaryReader(b);
    const format = reader.read7BitEncodedInt();
    if (format == 0) {
        deserializeDefault(reader, preset);
    } else if (format == 1) {
        deserializeXZOffset(reader, preset);
    } else {
        throw new Error("Unable to deserialize preset: unsupported preset format " + format);
    }
    const computedChecksum = calculateCrc32(b, 0, reader.offset);
    return [preset, computedChecksum];
}

function b64ToBytes(s) {
    const decodedString = atob(s);
    return Uint8Array.from(decodedString, char => char.charCodeAt(0));
}

export function importPreset(s) {
    try {
        const parts = s.split('.');
        if (parts.length != 3) {
            throw new Error("Unable to import preset: unexpected preset part count " + parts.length);
        }

        const prefix = parts[0];
        const dataB64 = parts[1];
        const checksumB64 = parts[2];

        if (prefix != "wms1") {
            throw new Error("Unable to import preset: missing wms1 prefix");
        }

        const dataBytes = b64ToBytes(dataB64);
        const [preset, computedChecksum] = deserializeWaymarkPresetV1(dataBytes);
        const expectedChecksum = new Uint32Array(b64ToBytes(checksumB64).buffer)[0];
        if (computedChecksum != expectedChecksum) {
            throw new Error("Unable to import preset: corrupted; checksum does not match");
        }
        return preset;
    } catch (e) {
        console.error("Error during deserialization:", e);
        throw e;
    }
}