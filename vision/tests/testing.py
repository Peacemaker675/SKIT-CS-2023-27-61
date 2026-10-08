from ultralytics import YOLO
import cv2

# --- 1. CONFIGURATION ---
# IMPORTANT: Use raw strings (r"") for Windows paths
MODEL_PATH = r"D:\IDD_Detection\runs\detect\yolo11s_idd_traffic_final\weights\best.pt" 
VIDEO_PATH = r"D:\IDD_Detection\vide.avi" 
OUTPUT_VIDEO_NAME = "output_traffic_analysis_live.avi"

# Class IDs that represent vehicles and riders (from your data.yaml)
VEHICLE_CLASSES = [1, 2, 3, 4, 5, 6, 7, 8, 9] 

# --- 2. SETUP ---
# Load your custom trained model
model = YOLO(MODEL_PATH)

# Video capture setup
cap = cv2.VideoCapture(VIDEO_PATH)
if not cap.isOpened():
    print(f"CRITICAL ERROR: Could not open video at {VIDEO_PATH}. Check file existence.")
    exit()

# Get video properties for saving the output
frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = cap.get(cv2.CAP_PROP_FPS)

# Video writer setup
fourcc = cv2.VideoWriter_fourcc(*'XVID')
out = cv2.VideoWriter(OUTPUT_VIDEO_NAME, fourcc, fps, (frame_width, frame_height))


# --- 3. PROCESSING LOOP (Real-Time Output) ---
while True:
    ret, frame = cap.read()
    if not ret:
        print("End of video stream. Releasing resources.")
        break

    # Run detection on the frame (stream=True for performance)
    results = model(frame, stream=True, device='cuda:0', verbose=False)

    # results is a generator; iterate once to get the main result object
    # This structure is necessary when using stream=True
    for result in results: 
        
        # Count vehicles
        vehicle_count = 0
        for cls_id in result.boxes.cls:
            if int(cls_id) in VEHICLE_CLASSES:
                vehicle_count += 1

        # Annotate frame with detections and labels
        frame_with_boxes = result.plot()

        # Overlay vehicle count 
        cv2.putText(frame_with_boxes,
                    f"Traffic Count: {vehicle_count}",
                    (20, 50),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1.5,
                    (0, 0, 255),
                    3)

        # Write to output file
        out.write(frame_with_boxes)
        
        # **ACTION: DISPLAY THE VIDEO LIVE**
        cv2.imshow("IDD Traffic Analysis - LIVE", frame_with_boxes)

    # **ACTION: CHECK FOR KEY PRESS**
    # This is required by OpenCV to refresh the display window.
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# --- 4. CLEANUP ---
cap.release()
out.release()
cv2.destroyAllWindows()
print(f"Processing complete. Output saved to {OUTPUT_VIDEO_NAME}")