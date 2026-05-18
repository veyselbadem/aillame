import fs from 'fs';
import path from 'path';

function checkGgufHeader(filePath) {
    if (!fs.existsSync(filePath)) return `MISSING: ${filePath}`;
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    const magic = buffer.toString('utf-8');
    return magic === 'GGUF' ? 'VALID_GGUF' : `INVALID_HEADER: ${magic}`;
}

const modelPath = 'C:\\Aillame\\Models\\nano\\qwen3-vl-4b\\model.gguf';
const mmprojPath = 'C:\\Aillame\\Models\\nano\\qwen3-vl-4b\\mmproj.gguf';

console.log(`Model: ${checkGgufHeader(modelPath)} (${(fs.statSync(modelPath).size / 1024 / 1024).toFixed(2)} MB)`);
console.log(`Mmproj: ${checkGgufHeader(mmprojPath)} (${(fs.statSync(mmprojPath).size / 1024 / 1024).toFixed(2)} MB)`);
