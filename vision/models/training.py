from ultralytics import YOLO
import torch
import os

def train_rtx_3050_optimized():
    """
    Final optimized training function for the 22GB IDD dataset 
    on the memory-constrained RTX 3050 (4GB VRAM).
    
    This version uses negative batch size for auto-accumulation (final fix).
    """
    
    # --- 1. CONFIGURATION ---
    DATA_YAML_PATH = "data.yaml"
    MODEL_SIZE = "yolo11s.pt"   
    
    # VRAM and Efficiency Optimizations
    # Setting batch=-1 enables auto-batching and gradient accumulation internally
    MAX_BATCH_SIZE = -1          
    

    MIXED_PRECISION = True      
    OPTIMAL_WORKERS = 8          
    NUM_EPOCHS = 300             
    PATIENCE = 50                
    
    
    if not torch.cuda.is_available():
        print("🚨 WARNING: CUDA not available. Training will be extremely slow on CPU.")
        device_to_use = 'cpu'
    else:
    
        device_to_use = 'cuda:0' 

    print(f"Loading model: {MODEL_SIZE}. Training on device: {device_to_use}")
    model = YOLO(MODEL_SIZE)

    print("Starting training with automatic batch sizing and gradient accumulation...")
    
    
    results = model.train(
        data=DATA_YAML_PATH,
        epochs=NUM_EPOCHS,
        imgsz=640,
        device=device_to_use,
        
       
       
        batch=MAX_BATCH_SIZE, 
        
        workers=OPTIMAL_WORKERS,
        
       
        amp=MIXED_PRECISION, 
        
       
        optimizer='AdamW',              
        patience=PATIENCE,
        name=f"yolo11s_idd_traffic_final",
    )

    print("Training complete. Model saved in runs/detect/yolo11s_idd_traffic_final")
    
if __name__ == '__main__':
    train_rtx_3050_optimized()












