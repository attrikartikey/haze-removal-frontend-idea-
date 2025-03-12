const imageUpload = document.getElementById('image-upload');
const originalImage = document.getElementById('original-image');
const dehazedCanvas = document.getElementById('dehazed-image');
const loadingIndicator = document.getElementById('loading-indicator');
const ctx = dehazedCanvas.getContext('2d');

imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage.src = e.target.result;
            originalImage.onload = () => {
                processImage(originalImage);
            };
        };
        reader.readAsDataURL(file);
    }
});

async function processImage(img) {
    loadingIndicator.style.display = 'block';
    ctx.clearRect(0, 0, dehazedCanvas.width, dehazedCanvas.height);
    const width = img.width;
    const height = img.height;
    dehazedCanvas.width = width;
    dehazedCanvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    let data = imageData.data;

    // Subtle Contrast Adjustment
    data = increaseContrast(data, 3); // Reduced contrast

    // Dehaze
    const atmosphere = estimateAtmosphere(data);
    const transmission = estimateTransmission(data, atmosphere);
    data = dehaze(data, atmosphere, transmission);

    // Subtle Sharpening
    data = sharpen(data, width, height, 0.05); // Reduced sharpening

    //Color Saturation
    data = adjustSaturation(data, 1.1); //very slight saturation boost

    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);
    loadingIndicator.style.display = 'none';
}

function increaseContrast(data, value) {
    const factor = (259 * (value + 255)) / (255 * (259 - value));
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
        data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
    }
    return data;
}

function estimateAtmosphere(data) {
    let topPixels = [];
    for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        topPixels.push({ brightness: brightness, r: data[i], g: data[i + 1], b: data[i + 2] });
    }
    topPixels.sort((a, b) => b.brightness - a.brightness);
    let topPercentage = Math.floor(topPixels.length * 0.001); // Top 0.1%
    let atmosphere = { r: 0, g: 0, b: 0 };
    for (let i = 0; i < topPercentage; i++) {
        atmosphere.r += topPixels[i].r;
        atmosphere.g += topPixels[i].g;
        atmosphere.b += topPixels[i].b;
    }
    atmosphere.r /= topPercentage;
    atmosphere.g /= topPercentage;
    atmosphere.b /= topPercentage;
    return atmosphere;
}

function estimateTransmission(data, atmosphere) {
    const transmission = [];
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const t = 1 - Math.max(Math.abs(r - atmosphere.r), Math.abs(g - atmosphere.g), Math.abs(b - atmosphere.b)) / 255;
        const minimumTransmission = t > 0.5 ? 0.1 : 0.2; // Adjust these values as needed.
        transmission.push(Math.max(minimumTransmission, t));
    }
    return transmission;
}

function dehaze(data, atmosphere, transmission) {
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const t = transmission[i / 4];
        data[i] = (r - atmosphere.r) / t + atmosphere.r;
        data[i + 1] = (g - atmosphere.g) / t + atmosphere.g;
        data[i + 2] = (b - atmosphere.b) / t + atmosphere.b;
    }
    return data;
}

function sharpen(data, width, height, amount) {
    const newData = new Uint8ClampedArray(data.length);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = (y * width + x) * 4;
            for (let j = 0; j < 3; j++) {
                const original = data[i + j];
                const sharpened = original * (1 + amount) -
                    (data[i - 4 + j] + data[i + 4 + j] + data[i - width * 4 + j] + data[i + width * 4 + j]) * amount / 4;
                newData[i + j] = Math.max(0, Math.min(255, sharpened));
            }
            newData[i + 3] = data[i + 3]; // Alpha
        }
    }
    return newData;
}

function adjustSaturation(data, amount) {
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + amount * (r - gray);
        g = gray + amount * (g - gray);
        b = gray + amount * (b - gray);

        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
    }
    return data;
}