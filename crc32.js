export function calculateCrc32(data, start, length) {
    // CRC-32-IEEE 802.3 polynomial
    const polynomial = 0xEDB88320;
    const crcTable = new Uint32Array(256);

    // Pre-calculate the CRC32 lookup table
    for (let i = 0; i < 256; i++) {
        let entry = i;
        for (let j = 0; j < 8; j++) {
            if ((entry & 1) === 1) {
                entry = (entry >>> 1) ^ polynomial;
            } else {
                entry = (entry >>> 1);
            }
        }
        crcTable[i] = entry;
    }

    // Initialize CRC value
    let crc = 0xFFFFFFFF;

    // Iterate through the data and update CRC
    for (let i = start; i < start + length; i++) {
        crc = (crc >>> 8) ^ crcTable[(data[i] ^ crc) & 0xFF];
    }

    // Final XOR inversion
    return ~crc >>> 0; // The >>> 0 ensures the result is an unsigned 32-bit integer
}
