const canvas = document.getElementById('voiceCanvas');
const ctx = canvas.getContext('2d');
const toggleButton = document.getElementById('toggleButton');
const terminalContent = document.getElementById('terminalContent');
const captionContainer = document.getElementById('captionContainer');

let isListening = false;
let audioContext;
let analyser;
let animationFrame;
let recognition;

function isChrome() {
    return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
}

function suggestChrome() {
    if (!isChrome()) {
        const message = 'For the best experience, please use Google Chrome. Click OK to open this page in Chrome, or Cancel to continue in your current browser.';
        if (confirm(message)) {
            const chromeUrl = 'googlechrome://navigate?url=' + encodeURIComponent(window.location.href);
            window.location.href = chromeUrl;
        } else {
            addTerminalMessage('Continuing in current browser. Some features may not work as expected.');
        }
    }
}

window.onload = suggestChrome;

const startListening = async () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        isListening = true;
        toggleButton.textContent = 'Stop Listening';
        toggleButton.style.backgroundColor = '#ef4444';
        animateMicrophone();
        addTerminalMessage('Listening started...');
        startSpeechRecognition();
    } catch (error) {
        console.error('Error accessing microphone:', error);
        addTerminalMessage('Error: Unable to access microphone');
    }
};

const stopListening = () => {
    isListening = false;
    toggleButton.textContent = 'Start Listening';
    toggleButton.style.backgroundColor = '#ec4899';
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
    addTerminalMessage('Listening stopped.');
    stopSpeechRecognition();
};

toggleButton.addEventListener('click', () => {
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
});

const animateMicrophone = () => {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const barCount = 180;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;
    const maxBarHeight = 100;
    const baseHeight = 10;
    const variationFactor = 0.5;

    const barHeights = new Array(barCount).fill(baseHeight);

    const draw = () => {
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFC0CB';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 10, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // Draw the bars
        for (let i = 0; i < barCount; i++) {
            const angle = (i / barCount) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            const dataIndex = Math.floor((i / barCount) * bufferLength);
            const targetHeight = (dataArray[dataIndex] / 255) * maxBarHeight;

            barHeights[i] += (targetHeight - barHeights[i]) * 0.2;

            const variation = Math.sin(Date.now() * 0.01 + i * 0.1) * variationFactor;
            const barHeight = Math.max(baseHeight, barHeights[i] + variation);

            const endX = centerX + Math.cos(angle) * (radius + barHeight);
            const endY = centerY + Math.sin(angle) * (radius + barHeight);

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(endX, endY);
            ctx.lineWidth = 2;
            ctx.strokeStyle = `rgba(255, 20, 147, ${barHeight / maxBarHeight})`;
            ctx.stroke();
        }

        const pulseRadius = radius - 20 + Math.sin(Date.now() / 200) * 5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 192, 203, 0.3)';
        ctx.fill();

        animationFrame = requestAnimationFrame(draw);
    };

    draw();
};

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const radius = 80;

ctx.beginPath();
ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
ctx.fillStyle = '#FFC0CB';
ctx.fill();

ctx.beginPath();
ctx.arc(centerX, centerY, radius - 10, 0, 2 * Math.PI);
ctx.fillStyle = '#FFFFFF';
ctx.fill();

function addTerminalMessage(message) {
    const timestamp = new Date().toLocaleTimeString();
    terminalContent.innerHTML += `<div>[${timestamp}] ${message}</div>`;
    terminalContent.scrollTop = terminalContent.scrollHeight;
}

addTerminalMessage('Voice Circle Visualization ready.');

function startSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = function(event) {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    addTerminalMessage('Recognized: ' + event.results[i][0].transcript);
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            captionContainer.textContent = interimTranscript;
        };

        recognition.onerror = function(event) {
            addTerminalMessage('Recognition error: ' + event.error);
        };

        recognition.onend = function() {
            if (isListening) {
                recognition.start();
            }
        };

        recognition.start();
    } else {
        addTerminalMessage('Speech recognition not supported in this browser.');
    }
}

function stopSpeechRecognition() {
    if (recognition) {
        recognition.stop();
    }
    captionContainer.textContent = '';
}