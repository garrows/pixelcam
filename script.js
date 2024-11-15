// public/script.js
const video = document.querySelector('video');
const inputCanvas = document.getElementById('input');
const outputCanvas = document.getElementById('output');
const colorBits = document.getElementById('colorBits');
const resolution = document.getElementById('resolution');
const inputCtx = inputCanvas.getContext('2d');
const outputCtx = outputCanvas.getContext('2d');
const img = document.getElementById("image");

const constraints = window.constraints = {
    audio: false,
    video: true
};


function draw() {
    const size = parseInt(resolution.value);
    outputCanvas.width = size;
    outputCanvas.height = size;

    const { width, height } = inputCanvas;
    const offset = (img.width - img.height) / 2;
    if (!video.paused) {
        inputCtx.drawImage(video, -offset, 0, video.videoWidth, video.videoHeight);
    } else {
        inputCtx.drawImage(img, offset, 0, width, height, 0, 0, width, height);
    }

    const frameObj = inputCtx.getImageData(0, 0, width, height);
    const inputData = frameObj.data;
    const outputImage = outputCtx.createImageData(outputCanvas.width, outputCanvas.height);
    const outputData = outputImage.data;

    for (let oI = 0; oI < outputData.length; oI += 4) {
        const oY = Math.floor(oI / 4 / outputCanvas.width);
        const oX = (oI / 4) - (oY * outputCanvas.width);
        const iY = oY * (inputCanvas.height / outputCanvas.height);
        const iX = oX * (inputCanvas.width / outputCanvas.width);

        const multiple = (inputCanvas.height / outputCanvas.height);
        let sumR = 0, sumG = 0, sumB = 0, sampleCount = 0;
        for (let offsetY = 0; offsetY < multiple; offsetY++) {
            for (let offsetX = 0; offsetX < multiple; offsetX++) {
                const iI = ((iY + offsetY) * inputCanvas.width + (iX + offsetX)) * 4;
                if (isNaN(inputData[iI])) { continue } // Maths is wrong somewhere on the bottom edge. This hacks around it
                sumR += inputData[iI];
                sumG += inputData[iI + 1];
                sumB += inputData[iI + 2];
                sampleCount++;
            }
        }

        outputData[oI] = downsample(sumR / sampleCount);
        outputData[oI + 1] = downsample(sumG / sampleCount);
        outputData[oI + 2] = downsample(sumB / sampleCount);
        outputData[oI + 3] = 255;
    }

    inputCtx.putImageData(frameObj, 0, 0);
    outputCtx.putImageData(outputImage, 0, 0);

    requestAnimationFrame(draw);
}
function downsample(num) {
    const inputBits = 8
    const outputBits = parseInt(colorBits.value);
    const inputRange = Math.pow(2, inputBits) - 1;
    const outputRange = Math.pow(2, outputBits) - 1;
    const inputPercent = num / inputRange;
    const down = Math.round(outputRange * inputPercent);
    const outputPercent = down / outputRange;
    const up = outputPercent * inputRange;
    return up;
}

function handleSuccess(stream) {

    const videoTracks = stream.getVideoTracks();
    console.log('Got stream with constraints:', constraints);
    console.log(`Using video device: ${videoTracks[0].label}`);
    window.stream = stream; // make variable available to browser console
    video.srcObject = stream;


    video.addEventListener(
        "play",
        () => {
            inputCanvas.width = video.videoHeight; // Make it square
            inputCanvas.height = video.videoHeight;
        },
        false,
    );
}

function handleError(error) {
    if (error.name === 'OverconstrainedError') {
        alert(`OverconstrainedError: The constraints could not be satisfied by the available devices. Constraints: ${JSON.stringify(constraints)}`);
    } else if (error.name === 'NotAllowedError') {
        alert('NotAllowedError: Permissions have not been granted to use your camera and ' +
            'microphone, you need to allow the page access to your devices in ' +
            'order for the demo to work.');
    }
    alert(`getUserMedia error: ${error.name}`);
}

async function init(e) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        handleSuccess(stream);
    } catch (e) {
        handleError(e);
    }
}
draw();
document.querySelector('#showVideo').addEventListener('click', e => init(e));