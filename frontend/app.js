"use strict";

// ==========================================================
// CONFIGURATION
// ==========================================================

const BACKEND_WS_URL =
    "wss://swarm-duke-kung.ngrok-free.dev/ws/detect";

// ==========================================================
// DOM ELEMENTS
// ==========================================================

const video = document.getElementById("camera");
const canvas = document.getElementById("resultCanvas");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusText = document.getElementById("status");
const detectionsContainer = document.getElementById("detections");

const context = canvas ? canvas.getContext("2d") : null;

// ==========================================================
// STATE
// ==========================================================

let cameraStream = null;
let socket = null;
let frameTimer = null;
let isSendingFrame = false;

// ==========================================================
// INITIAL CHECK
// ==========================================================

console.log("Current page:", window.location.href);
console.log("Secure context:", window.isSecureContext);
console.log("Backend WebSocket URL:", BACKEND_WS_URL);

if (
    !video ||
    !canvas ||
    !startBtn ||
    !stopBtn ||
    !statusText ||
    !detectionsContainer
) {
    console.error("Required HTML elements are missing.");

    if (statusText) {
        statusText.textContent =
            "Frontend error: required HTML element is missing.";
    }
} else {
    startBtn.addEventListener("click", startCamera);
    stopBtn.addEventListener("click", stopCamera);

    stopBtn.disabled = true;
}

// ==========================================================
// START CAMERA
// ==========================================================

async function startCamera() {
    if (!video || !canvas || !startBtn || !stopBtn) {
        console.error("Camera elements are missing.");
        return;
    }

    // Stop previous camera/socket/timer
    stopCamera(false);

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {
        statusText.textContent =
            "Camera API unavailable. Open this page using HTTPS or localhost.";

        console.error(
            "navigator.mediaDevices.getUserMedia is unavailable."
        );

        return;
    }

    try {
        statusText.textContent =
            "Requesting camera permission...";

        console.log("Requesting camera permission...");

        const rearCameraConstraints = {
            video: {
                facingMode: {
                    ideal: "environment"
                },
                width: {
                    ideal: 640
                },
                height: {
                    ideal: 480
                }
            },
            audio: false
        };

        try {
            cameraStream =
                await navigator.mediaDevices.getUserMedia(
                    rearCameraConstraints
                );
        } catch (rearCameraError) {
            console.warn(
                "Rear camera failed. Trying default camera.",
                rearCameraError.name,
                rearCameraError.message
            );

            cameraStream =
                await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });
        }

        video.srcObject = cameraStream;

        await new Promise((resolve) => {
            if (video.readyState >= 1) {
                resolve();
            } else {
                video.onloadedmetadata = resolve;
            }
        });

        await video.play();

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        startBtn.disabled = true;
        stopBtn.disabled = false;

        statusText.textContent = "Camera started";

        console.log(
            "Camera started:",
            video.videoWidth,
            "x",
            video.videoHeight
        );

        connectWebSocket();

    } catch (error) {
        console.error(
            "Camera error:",
            error.name,
            error.message
        );

        stopCamera(false);

        if (error.name === "NotAllowedError") {
            statusText.textContent =
                "Camera permission denied. Allow camera permission in browser settings.";
        } else if (error.name === "NotFoundError") {
            statusText.textContent =
                "No camera device found.";
        } else if (error.name === "NotReadableError") {
            statusText.textContent =
                "Camera is being used by another application.";
        } else if (error.name === "SecurityError") {
            statusText.textContent =
                "Security error. Open the HTTPS ngrok URL.";
        } else if (error.name === "OverconstrainedError") {
            statusText.textContent =
                "Camera constraints are not supported.";
        } else {
            statusText.textContent =
                "Camera error: " +
                error.name +
                " - " +
                error.message;
        }
    }
}

// ==========================================================
// STOP CAMERA
// ==========================================================

function stopCamera(updateStatus = true) {
    if (frameTimer !== null) {
        clearInterval(frameTimer);
        frameTimer = null;
    }

    if (socket !== null) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;

        if (
            socket.readyState === WebSocket.OPEN ||
            socket.readyState === WebSocket.CONNECTING
        ) {
            socket.close();
        }

        socket = null;
    }

    if (cameraStream !== null) {
        cameraStream.getTracks().forEach((track) => {
            track.stop();
        });

        cameraStream = null;
    }

    if (video) {
        video.pause();
        video.srcObject = null;
    }

    if (canvas && context) {
        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
    }

    isSendingFrame = false;

    if (startBtn) {
        startBtn.disabled = false;
    }

    if (stopBtn) {
        stopBtn.disabled = true;
    }

    if (updateStatus && statusText) {
        statusText.textContent = "Camera stopped";
    }

    console.log("Camera stopped");
}

// ==========================================================
// CONNECT WEBSOCKET
// ==========================================================

function connectWebSocket() {
    if (socket !== null) {
        socket.close();
        socket = null;
    }

    if (frameTimer !== null) {
        clearInterval(frameTimer);
        frameTimer = null;
    }

    statusText.textContent =
        "Connecting to detection backend...";

    console.log(
        "Connecting to WebSocket:",
        BACKEND_WS_URL
    );

    try {
        socket = new WebSocket(BACKEND_WS_URL);
    } catch (error) {
        console.error(
            "WebSocket creation failed:",
            error
        );

        statusText.textContent =
            "WebSocket connection failed.";

        startBtn.disabled = false;
        stopBtn.disabled = true;

        return;
    }

    socket.onopen = () => {
        console.log("WebSocket connected");

        statusText.textContent =
            "Connected. Detecting...";

        if (frameTimer !== null) {
            clearInterval(frameTimer);
        }

        frameTimer = setInterval(() => {
            sendFrame();
        }, 250);
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.error) {
                console.error(
                    "Backend error:",
                    data.error
                );

                isSendingFrame = false;
                return;
            }

            if (data.image) {
                drawProcessedImage(data.image);
            }

            if (Array.isArray(data.detections)) {
                console.log(
                    "Detected objects:",
                    data.detections.length
                );

                showDetections(data.detections);
            }

            isSendingFrame = false;

        } catch (error) {
            console.error(
                "Invalid backend response:",
                error
            );

            isSendingFrame = false;
        }
    };

    socket.onerror = (error) => {
        console.error("WebSocket error:", error);

        statusText.textContent =
            "WebSocket connection failed.";

        isSendingFrame = false;

        if (frameTimer !== null) {
            clearInterval(frameTimer);
            frameTimer = null;
        }

        startBtn.disabled = false;
        stopBtn.disabled = true;
    };

    socket.onclose = () => {
        console.log("WebSocket closed");

        isSendingFrame = false;

        if (frameTimer !== null) {
            clearInterval(frameTimer);
            frameTimer = null;
        }

        if (
            statusText.textContent !== "Camera stopped"
        ) {
            statusText.textContent =
                "Backend disconnected.";
        }

        startBtn.disabled = false;
        stopBtn.disabled = true;
    };
}

// ==========================================================
// SEND FRAME
// ==========================================================

function sendFrame() {
    if (isSendingFrame) {
        return;
    }

    if (
        !socket ||
        socket.readyState !== WebSocket.OPEN
    ) {
        return;
    }

    if (
        !video ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
    ) {
        return;
    }

    const captureCanvas =
        document.createElement("canvas");

    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;

    const captureContext =
        captureCanvas.getContext("2d");

    if (!captureContext) {
        return;
    }

    captureContext.drawImage(
        video,
        0,
        0,
        captureCanvas.width,
        captureCanvas.height
    );

    const base64Data =
        captureCanvas.toDataURL(
            "image/jpeg",
            0.7
        );

    try {
        isSendingFrame = true;

        socket.send(base64Data);

        console.log("Frame sent");
    } catch (error) {
        console.error(
            "Frame sending failed:",
            error
        );

        isSendingFrame = false;
    }
}

// ==========================================================
// DRAW PROCESSED IMAGE
// ==========================================================

function drawProcessedImage(base64Image) {
    if (!context || !canvas) {
        return;
    }

    const image = new Image();

    image.onload = () => {
        canvas.width = image.width;
        canvas.height = image.height;

        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        context.drawImage(
            image,
            0,
            0,
            canvas.width,
            canvas.height
        );
    };

    image.onerror = () => {
        console.error(
            "Could not load processed image."
        );
    };

    image.src =
        "data:image/jpeg;base64," +
        base64Image;
}

// ==========================================================
// SHOW ALL DETECTIONS
// ==========================================================

function showDetections(detections) {
    if (!detectionsContainer) {
        return;
    }

    detectionsContainer.innerHTML = "";

    if (!detections || detections.length === 0) {
        detectionsContainer.innerHTML =
            '<p class="empty">No objects detected</p>';

        return;
    }

    detections.forEach((detection) => {
        const item =
            document.createElement("div");

        item.className = "detection-item";

        const name =
            document.createElement("span");

        name.className = "class-name";
        name.textContent =
            detection.class_name || "Unknown";

        const confidence =
            document.createElement("span");

        confidence.className = "confidence";

        const score =
            Number(detection.confidence || 0) * 100;

        confidence.textContent =
            score.toFixed(1) + "%";

        item.appendChild(name);
        item.appendChild(confidence);

        detectionsContainer.appendChild(item);
    });
}

// ==========================================================
// VIDEO METADATA
// ==========================================================

if (video) {
    video.addEventListener("loadedmetadata", () => {
        if (canvas) {
            canvas.width =
                video.videoWidth || 640;

            canvas.height =
                video.videoHeight || 480;
        }
    });
}