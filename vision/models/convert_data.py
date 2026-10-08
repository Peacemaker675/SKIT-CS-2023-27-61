import os
import shutil
import xml.etree.ElementTree as ET
import sys
import time

IDD_ROOT = r'D:\IDD_Detection'
YOLO_OUTPUT_DIR_NAME = 'IDD_YOLO_Final'
YOLO_OUTPUT_ROOT = os.path.join(IDD_ROOT, YOLO_OUTPUT_DIR_NAME)
ANNOTATIONS_ROOT = os.path.join(IDD_ROOT, 'Annotations')
IMAGES_ROOT = os.path.join(IDD_ROOT, 'JPEGImages')

CLASSES = [
    'person', 'rider', 'bicycle', 'car', 'bus', 'truck',
    'vehicle fallback', 'motorcycle', 'auto rickshaw', 'e-rickshaw',
    'animal', 'traffic sign', 'traffic light', 'unknown'
]

sys.setrecursionlimit(4000)

def convert_to_yolo_format(size, box):
    xmin, ymax, xmax, ymin = box
    dw = 1. / size[0]
    dh = 1. / size[1]
    x_center = (xmin + xmax) / 2.0
    y_center = (ymin + ymax) / 2.0
    width = xmax - xmin
    height = ymax - ymin
    return (x_center * dw, y_center * dh, width * dw, height * dh)

def process_annotation(xml_file_path):
    lines = []
    try:
        tree = ET.parse(xml_file_path)
        root = tree.getroot()
    except Exception as e:
        print(f"Error parsing XML {xml_file_path}: {e}")
        return lines
    size = root.find('size')
    w = int(size.find('width').text)
    h = int(size.find('height').text)
    img_size = (w, h)
    for obj in root.findall('object'):
        class_name = obj.find('name').text
        try:
            class_id = CLASSES.index(class_name)
        except ValueError:
            continue
        bndbox = obj.find('bndbox')
        box = (
            int(bndbox.find('xmin').text),
            int(bndbox.find('ymax').text),
            int(bndbox.find('xmax').text),
            int(bndbox.find('ymin').text)
        )
        yolo_box = convert_to_yolo_format(img_size, box)
        lines.append(f"{class_id} {yolo_box[0]:.6f} {yolo_box[1]:.6f} {yolo_box[2]:.6f} {yolo_box[3]:.6f}\n")
    return lines

def restructure_dataset():
    for folder in ['images/train', 'images/val', 'images/test',
                   'labels/train', 'labels/val', 'labels/test']:
        os.makedirs(os.path.join(YOLO_OUTPUT_ROOT, folder), exist_ok=True)
    print(f"Starting IDD conversion into: {YOLO_OUTPUT_ROOT}. This will take a long time.")
    start_time = time.time()
    xml_path_cache = {}
    print("Building XML path cache...")
    for root_dir, _, files in os.walk(ANNOTATIONS_ROOT):
        for file in files:
            if file.endswith('.xml'):
                xml_path_cache[file] = os.path.join(root_dir, file)
    print(f"Cache built with {len(xml_path_cache)} annotations in {time.time() - start_time:.2f}s.")
    for split in ['train', 'val', 'test']:
        list_file_path = os.path.join(IDD_ROOT, f'{split}.txt')
        if not os.path.exists(list_file_path):
            continue
        with open(list_file_path, 'r') as f:
            relative_paths = f.read().splitlines()
        print(f"\nProcessing {len(relative_paths)} entries for {split}...")
        for i, relative_path in enumerate(relative_paths):
            if i % 10000 == 0 and i != 0:
                print(f"  Processed {i}/{len(relative_paths)} files in {split}...")
            image_name = relative_path.split('/')[-1]
            xml_filename = image_name + '.xml'
            found_xml_path = xml_path_cache.get(xml_filename)
            if not found_xml_path:
                continue
            yolo_lines = process_annotation(found_xml_path)
            if not yolo_lines:
                continue
            src_image_path = os.path.join(IMAGES_ROOT, relative_path + '.jpg')
            if not os.path.exists(src_image_path):
                src_image_path = os.path.join(IMAGES_ROOT, relative_path + '.png')
                if not os.path.exists(src_image_path):
                    continue
            dst_image_path = os.path.join(YOLO_OUTPUT_ROOT, 'images', split, image_name + '.jpg')
            dst_label_path = os.path.join(YOLO_OUTPUT_ROOT, 'labels', split, image_name + '.txt')
            with open(dst_label_path, 'w') as out_file:
                out_file.writelines(yolo_lines)
            try:
                shutil.copy(src_image_path, dst_image_path)
            except Exception as e:
                print(f"Error copying image {image_name}: {e}")
        print(f"Finished processing {split} split. Files saved to {YOLO_OUTPUT_ROOT}/images/{split} and labels/{split}.")
    total_time = time.time() - start_time
    print(f"\n✅ Conversion COMPLETE. Total time: {total_time:.2f} seconds.")
    return YOLO_OUTPUT_ROOT

if __name__ == '__main__':
    restructure_dataset()
