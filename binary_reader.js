import Vector3 from "./vector3.js";

class BinaryReader {
    /**
     * @param {Uint8Array} byteArray - The byte array to read from.
     */
    constructor(byteArray) {
        this.dataView = new DataView(byteArray.buffer, byteArray.byteOffset, byteArray.byteLength);
        this.offset = 0;
    }

    readUInt16() {
        const value = this.dataView.getUint16(this.offset, true); // true for little-endian
        this.offset += 2;
        return value;
    }

    readUInt32() {
        const value = this.dataView.getUint32(this.offset, true); // true for little-endian
        this.offset += 4;
        return value;
    }

    readByte() {
        const value = this.dataView.getUint8(this.offset);
        this.offset += 1;
        return value;
    }

    read7BitEncodedInt() {
        let value = 0;
        let shift = 0;
        let b;
        do {
            b = this.readByte();
            value |= (b & 0x7F) << shift;
            shift += 7;
            if (shift >= 35) {
                throw new Error("Invalid 7-bit encoded integer format: too many bytes.");
            }
        } while ((b & 0x80) !== 0);

        return value;
    }

    read7BitEncodedIntSigned() {
        const value = this.read7BitEncodedInt();
        return (value >>> 1) ^ -(value & 1); // Zig-zag decode
    }

    readVector3() {
        const x = this.read7BitEncodedIntSigned() / 1000;
        const y = this.read7BitEncodedIntSigned() / 1000;
        const z = this.read7BitEncodedIntSigned() / 1000;
        return new Vector3(x, y, z);
    }

    readXZVector2() {
        const x = this.read7BitEncodedIntSigned() / 1000;
        const y = 0;
        const z = this.read7BitEncodedIntSigned() / 1000;
        return new Vector3(x, y, z);
    }

    readString() {
        const length = this.read7BitEncodedInt();
        const bytes = new Uint8Array(this.dataView.buffer, this.dataView.byteOffset + this.offset, length);
        this.offset += length;
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(bytes);
    }
}
export default BinaryReader;
