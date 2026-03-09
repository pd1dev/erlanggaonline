const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const outputDir = path.join(__dirname, '..', 'public', 'uploads', 'images');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB
const MAX_DIMENSION = 1200; // Max width/height for large files

async function processImage(file, prefix = 'img') {
    if (!file || !file.buffer) {
        return null;
    }

    const filename = `${prefix}-${Date.now()}.webp`;
    const outputPath = path.join(outputDir, filename);
    const fileSize = file.size || (file.buffer ? file.buffer.length : 0);
    const isLargeFile = fileSize > MAX_FILE_SIZE_BYTES;

    try {
        let pipeline = sharp(file.buffer);

        if (isLargeFile) {
            pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
                fit: 'inside',
                withoutEnlargement: true
            });
            pipeline = pipeline.webp({ quality: 70 });
        } else {
            pipeline = pipeline.resize(1920, 1080, {
                fit: 'inside',
                withoutEnlargement: true
            });
            pipeline = pipeline.webp({ quality: 80 });
        }

        await pipeline.toFile(outputPath);
        return `/uploads/images/${filename}`;
    } catch (error) {
        console.error('Image processing error:', error);
        return null;
    }
}

async function processImageFromPath(filePath, prefix = 'img', options = {}) {
    const filename = `${prefix}-${Date.now()}.webp`;
    const outputPath = path.join(outputDir, filename);
    
    const isLargeFile = options.isLargeFile || false;
    const maxDimension = options.maxDimension || 1920;
    const quality = options.quality || 80;

    try {
        await sharp(filePath)
            .resize(maxDimension, maxDimension, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({ quality: quality })
            .toFile(outputPath);

        return `/uploads/images/${filename}`;
    } catch (error) {
        console.error('Image processing error:', error);
        return null;
    }
}

module.exports = { processImage, processImageFromPath };
