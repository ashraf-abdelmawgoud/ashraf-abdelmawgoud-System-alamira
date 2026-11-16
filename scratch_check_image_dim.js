const fs = require('fs');

// Simple JPEG dimensions reader
function getJpegDimensions(buffer) {
    let offset = 2; // Skip SOI (0xFFD8)
    while (offset < buffer.length) {
        if (buffer[offset] !== 0xFF) {
            break;
        }
        const marker = buffer[offset + 1];
        if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            return { width, height };
        }
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
    }
    return null;
}

const buf = fs.readFileSync('D:/Projects/System_Excel/assets/logo.png');
console.log('File size in bytes:', buf.length);
console.log('Dimensions:', getJpegDimensions(buf));
