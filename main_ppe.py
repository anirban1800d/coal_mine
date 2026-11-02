import base64
import cv2
import numpy as np

from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import torch
from ultralytics import YOLO

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse


# --------------------------------------------------
# App configuration
# --------------------------------------------------

app = FastAPI(title="PPE Real-Time Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Load trained model only once
# --------------------------------------------------

MODEL_PATH = Path(__file__).resolve().parent / "models" / "best.pt"

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Model file not found: {MODEL_PATH}"
    )

DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"

print("CUDA available:", torch.cuda.is_available())
print("Using device:", DEVICE)

model = YOLO(str(MODEL_PATH))

print("Model loaded successfully")
print("Classes:", model.names)

# --------------------------------------------------
# Real-time WebSocket detection
# --------------------------------------------------

@app.websocket("/ws/detect")
async def detect_camera(websocket: WebSocket):
    await websocket.accept()

    print("Camera client connected")

    try:
        while True:
            # Receive base64 image from frontend
            image_data = await websocket.receive_text()

            # Remove data URL prefix
            if "," in image_data:
                image_data = image_data.split(",", 1)[1]

            # Decode base64
            image_bytes = base64.b64decode(image_data)

            # Convert bytes to NumPy array
            np_array = np.frombuffer(
                image_bytes,
                dtype=np.uint8
            )

            # Decode image
            frame = cv2.imdecode(
                np_array,
                cv2.IMREAD_COLOR
            )

            if frame is None:
                await websocket.send_json({
                    "error": "Invalid image frame"
                })
                continue

            # Run YOLO detection
            results = model.predict(
                source=frame,
                imgsz=640,
                conf=0.05,
                iou=0.45,
                max_det=100,
                device=DEVICE,
                verbose=False
            )

            result = results[0]

            # Draw all detected bounding boxes
            annotated_frame = result.plot()

            detections = []

            if result.boxes is not None:
                for box in result.boxes:
                    class_id = int(box.cls[0])
                    confidence = float(box.conf[0])


                    print(
                        model.names[class_id],
                        round(confidence, 3)
                    )

                    x1, y1, x2, y2 = map(
                        int,
                        box.xyxy[0].tolist()
                    )

                    detection = {
                        "class_id": class_id,
                        "class_name": model.names[class_id],
                        "confidence": round(confidence, 3),
                        "box": {
                            "x1": x1,
                            "y1": y1,
                            "x2": x2,
                            "y2": y2
                        }
                    }

                    detections.append(detection)

            # Print all detections in terminal
            print(
                "Detected:",
                [
                    f"{item['class_name']} "
                    f"({item['confidence']})"
                    for item in detections
                ]
            )

            # Encode annotated frame as JPEG
            success, encoded_image = cv2.imencode(
                ".jpg",
                annotated_frame,
                [
                    cv2.IMWRITE_JPEG_QUALITY,
                    80
                ]
            )

            if not success:
                continue

            # Convert JPEG bytes to base64
            output_base64 = base64.b64encode(
                encoded_image.tobytes()
            ).decode("utf-8")

            # Send image and all detections to frontend
            await websocket.send_json({
                "image": output_base64,
                "detections": detections
            })

    except WebSocketDisconnect:
        print("Camera client disconnected")

    except Exception as error:
        print("Detection error:", repr(error))

        try:
            await websocket.close()
        except Exception:
            pass

# --------------------------------------------------
# Mount Static Files (Must be at the end)
# --------------------------------------------------
app.mount(
    "/",
    StaticFiles(directory="frontend", html=True),
    name="frontend"
)