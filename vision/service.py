import json
import os
import time
from datetime import datetime, timezone

import cv2
import redis
from ultralytics import YOLO

MODEL_PATH = os.getenv("MODEL_PATH", "yolo11s.pt")
VIDEO_PATH = os.getenv("VIDEO_SOURCE", "sample.mp4")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
INTERSECTION_ID = os.getenv("INTERSECTION_ID", "INT_001")

VEHICLE_CLASSES = {1, 2, 3, 4, 5, 6, 7, 8, 9}

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
model = YOLO(MODEL_PATH)


def lane_from_position(x1, y1, x2, y2, frame_w, frame_h):
    """
    Simple lane assignment based on center of bounding box.
    If you later have actual lane geometry, replace this with lane-aware logic.
    """
    cx = (x1 + x2) / 2.0
    cy = (y1 + y2) / 2.0

    if cx < frame_w * 0.5:
        return "west" if cy < frame_h * 0.5 else "south"
    return "east" if cy < frame_h * 0.5 else "north"


def build_empty_lane_counts():
    return {"north": 0, "south": 0, "east": 0, "west": 0}


def publish_telemetry(frame):
    results = model(frame, verbose=False)
    result = results[0]

    lane_counts = build_empty_lane_counts()

    if result.boxes is not None and len(result.boxes.xyxy) > 0:
        for i, box in enumerate(result.boxes.xyxy):
            cls_id = int(result.boxes.cls[i].item())
            if cls_id not in VEHICLE_CLASSES:
                continue

            x1, y1, x2, y2 = [float(v) for v in box.tolist()]
            lane = lane_from_position(x1, y1, x2, y2, frame.shape[1], frame.shape[0])
            lane_counts[lane] += 1

    vehicle_count = sum(lane_counts.values())
    queue_lengths = lane_counts.copy()

    payload = {
        "intersection_id": INTERSECTION_ID,
        "vehicle_count": vehicle_count,
        "vehicle_counts": lane_counts,
        "queue_lengths": queue_lengths,
        "max_queue_length": max(queue_lengths.values(), default=0),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "vision",
    }

    r.publish("traffic_updates", json.dumps(payload))
    print(f"[VISION] {INTERSECTION_ID} -> {payload}")
    return payload


def run_video(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    print(f"[VISION] Watching video: {video_path}")
    while True:
        ret, frame = cap.read()
        if not ret:
            print("[VISION] End of video stream.")
            break

        publish_telemetry(frame)
        time.sleep(0.2)  # keep cadence reasonable for RL / frontend

    cap.release()


def main():
    print(f"[VISION] Starting service")
    print(f"[VISION] MODEL_PATH={MODEL_PATH}")
    print(f"[VISION] VIDEO_PATH={VIDEO_PATH}")
    print(f"[VISION] REDIS_HOST={REDIS_HOST}:{REDIS_PORT}")
    print(f"[VISION] INTERSECTION_ID={INTERSECTION_ID}")

    run_video(VIDEO_PATH)


if __name__ == "__main__":
    main()