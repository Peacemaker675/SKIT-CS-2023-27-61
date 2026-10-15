from ultralytics import YOLO
import cv2


MODEL_PATH = "yolo11x.pt"
VIDEO_PATH = "hii.mp4" 
DISPLAY_WIDTH = 1000
DISPLAY_HEIGHT = 720


VEHICLE_CLASSES = [1, 2, 3, 4, 5, 6, 7, 8]  


model = YOLO(MODEL_PATH)


cap = cv2.VideoCapture(VIDEO_PATH)
if not cap.isOpened():
    print(f"Error: Could not open video at {VIDEO_PATH}")
    exit()

while True:
    ret, frame = cap.read()
    if not ret:
        print("End of video stream.")
        break

    
    results = model(frame)



    vehicle_count = 0
    for cls_id in results[0].boxes.cls:
        if int(cls_id) in VEHICLE_CLASSES:
            vehicle_count += 1

    # --- Annotate frame with detections ---
    frame_with_boxes = results[0].plot()

    # --- Overlay vehicle count ---
    cv2.putText(frame_with_boxes,
                f"Vehicles: {vehicle_count}",
                (20, 50),
                cv2.FONT_HERSHEY_SIMPLEX,
                1.5,
                (0, 0, 255),
                3)

    # --- Show frame ---
    cv2.imshow("YOLOv8 Vehicle Count", frame_with_boxes)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
