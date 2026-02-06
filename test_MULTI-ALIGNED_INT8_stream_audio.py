import os
import sys
import wave
import json
import time
import numpy as np
import torch
import torch.nn.functional as F
import torchaudio.transforms as T
import onnxruntime as ort 
from collections import deque

# ==========================================
# 0. CẤU HÌNH
# ==========================================
TEST_FILE = "merged_result.wav"
DA_FILE = "DA.json"

# 👇 FILE MODEL ONNX INT8 (MULTI-ALIGNED) 👇
MODEL_PATH = "multi-aligned_int8.onnx" 

# Ngưỡng bắt (Confidence Threshold)
CONFIDENCE_THRESHOLD = 0.50 

# Thông số Streaming & Matching
OFFSET_MS = 400
TOLERANCE_MS = 600

# ==========================================
# 1. CÁC HÀM TIỆN ÍCH (UTILS)
# ==========================================
def format_time(seconds):
    m, s = int(seconds // 60), seconds % 60
    return f"{m:02d}:{s:06.3f}"

def calculate_metrics(detections_ms, da_path, tolerance):
    try:
        with open(da_path, 'r', encoding='utf-8') as f:
            ground_truth = json.load(f)
    except: return None

    tp = 0
    gt_sevens = [item['start_ms'] for item in ground_truth if item['word'] == 'seven']
    total_sevens = len(gt_sevens)
    total_others = len([item for item in ground_truth if item['word'] == 'other'])
    
    used_gt_indices = set()

    for det_time in detections_ms:
        best_diff = float('inf'); best_gt_idx = -1
        for i, gt_start in enumerate(gt_sevens):
            diff = abs(det_time - gt_start)
            if diff <= tolerance and diff < best_diff:
                best_diff = diff; best_gt_idx = i
        
        if best_gt_idx != -1 and best_gt_idx not in used_gt_indices:
            used_gt_indices.add(best_gt_idx); tp += 1

    fp = len(detections_ms) - tp
    fn = total_sevens - tp
    tn = max(0, total_others - fp)

    acc = (tp + tn) / (tp + tn + fp + fn) if (tp+tn+fp+fn) > 0 else 0
    prec = tp / (tp + fp) if (tp + fp) > 0 else 0
    rec = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * (prec * rec) / (prec + rec) if (prec + rec) > 0 else 0

    return {"TP": tp, "TN": tn, "FP": fp, "FN": fn, "Acc": acc, "Prec": prec, "Rec": rec, "F1": f1}

def softmax(x):
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum(axis=1, keepdims=True)

# ==========================================
# 2. ENGINE TEST STREAMING (MULTI-ALIGNED INT8)
# ==========================================
class OnnxStreamingEngine:
    def __init__(self, model_path):
        print(f"🚀 Loading ONNX Model (Multi-Aligned): {model_path}")
        try:
            # Load ONNX Session
            self.sess = ort.InferenceSession(model_path)
            self.model_path = model_path
        except Exception as e:
            print(f"❌ Lỗi load ONNX: {e}"); sys.exit(1)

        self.inputs = self.sess.get_inputs()
        self.input_names = [i.name for i in self.inputs]
        print(f"ℹ️  Model Inputs: {self.input_names}")

        # Preprocessing (Torch CPU)
        self.mfcc_t = T.MFCC(sample_rate=16000, n_mfcc=40, melkwargs={'n_fft': 400, 'hop_length': 160, 'n_mels': 40})
        self.mel_t = T.MelSpectrogram(sample_rate=16000, n_fft=400, hop_length=160, n_mels=64)

    def _preprocess(self, audio_tensor):
        mfcc = self.mfcc_t(audio_tensor)
        mel = self.mel_t(audio_tensor)
        # Standardization (Z-Score)
        mfcc = (mfcc - mfcc.mean(dim=(1,2), keepdim=True)) / (mfcc.std(dim=(1,2), keepdim=True) + 1e-9)
        mel = (mel - mel.mean(dim=(1,2), keepdim=True)) / (mel.std(dim=(1,2), keepdim=True) + 1e-9)
        return mfcc.numpy(), mel.numpy()

    def run_file_test(self, audio_path):
        if not os.path.exists(audio_path): print("❌ File not found"); return [], [], 0

        # Load Ground Truth
        try:
            with open(DA_FILE, 'r', encoding='utf-8') as f: da_data = json.load(f)
            seven_starts = [item['start_ms'] for item in da_data if item['word'] == 'seven']
        except: seven_starts = []

        wf = wave.open(audio_path, 'rb')
        file_rate = wf.getframerate()
        n_channels = wf.getnchannels()
        total_frames = wf.getnframes()
        duration_sec = total_frames / file_rate

        print(f"🎧 Processing Streaming Audio (ONNX INT8 Multi-Aligned)...")
        print("-" * 100)
        print(f"{'TIME':<10} | {'CONF':<6} | {'STATUS':<10} | {'LATENCY':<8} | {'CHECK'}")
        print("-" * 100)

        READ_CHUNK = int(file_rate * 0.1) 
        buffer_16k = deque(maxlen=10)     
        prob_history = deque(maxlen=3)    
        
        detected_timestamps = []
        inference_times = []
        
        frame_idx = 0; cooldown = 0

        while True:
            data = wf.readframes(READ_CHUNK)
            if len(data) == 0: break
            
            # 1. Đọc & Xử lý Stereo
            native_numpy = np.frombuffer(data, dtype=np.int16)
            if n_channels > 1: 
                native_numpy = native_numpy.reshape(-1, n_channels).mean(axis=1).astype(np.int16)
            
            # 2. Resample (Simple slicing)
            if file_rate == 16000: resampled = native_numpy
            elif file_rate == 48000: resampled = native_numpy[::3]
            elif file_rate == 44100: 
                idx = np.linspace(0, len(native_numpy)-1, int(len(native_numpy) * 16000/44100)).astype(int)
                resampled = native_numpy[idx]
            else: resampled = native_numpy

            # 3. Buffer append
            chunk_16k = torch.from_numpy(resampled.astype(np.float32) / 32768.0)
            buffer_16k.append(chunk_16k)
            frame_idx += len(native_numpy)

            if len(buffer_16k) < 10: continue

            # 4. Input Tensor (Fix Padding)
            full_clip = torch.cat(list(buffer_16k))
            if full_clip.size(0) > 16000: 
                input_tensor = full_clip[-16000:]
            elif full_clip.size(0) < 16000:
                pad_size = 16000 - full_clip.size(0)
                input_tensor = F.pad(full_clip, (0, pad_size))
            else:
                input_tensor = full_clip
            
            input_tensor = input_tensor.unsqueeze(0)

            # 5. Inference
            t_start = time.perf_counter()
            
            mfcc_np, mel_np = self._preprocess(input_tensor)
            
            # Tự động map inputs (Hỗ trợ 1 hoặc 2 input)
            if len(self.input_names) == 2:
                ort_inputs = {self.input_names[0]: mfcc_np, self.input_names[1]: mel_np}
            else:
                ort_inputs = {self.input_names[0]: mfcc_np}
            
            logits = self.sess.run(None, ort_inputs)[0]
            
            t_end = time.perf_counter()
            inference_times.append(t_end - t_start)

            # 6. Logic Detection (MULTI-ALIGNED)
            probs = softmax(logits)[0] # Shape [4] ví dụ: [Noise, se, ven, n]
            
            # --- TÍNH TỔNG XÁC SUẤT WAKE WORD ---
            # Giả sử class 0 là Noise/Other. Các class còn lại (1, 2, 3...) là Wake.
            # Ta cộng tổng xác suất của các phần Wake word lại.
            if len(probs) > 2:
                p_wake = np.sum(probs[1:]) # Cộng từ index 1 đến hết (1+2+3)
            else:
                p_wake = probs[1] # Fallback nếu lỡ đưa model binary vào
            
            prob_history.append(p_wake)
            avg_wake = np.mean(prob_history)

            current_ms = (frame_idx / file_rate) * 1000
            estimate_start_ms = current_ms - OFFSET_MS

            if cooldown > 0: 
                cooldown -= 1
            elif avg_wake >= CONFIDENCE_THRESHOLD:
                detected_timestamps.append(estimate_start_ms)
                
                min_dist = float('inf')
                for da in seven_starts:
                    dist = estimate_start_ms - da
                    if abs(dist) < abs(min_dist): min_dist = dist
                
                check_str = f"✅ ({min_dist:+.0f}ms)" if abs(min_dist) <= TOLERANCE_MS else f"❌ ({min_dist:+.0f}ms)"
                latency_ms = (t_end - t_start) * 1000
                print(f"{format_time(current_ms/1000):<10} | {avg_wake:.2f}   | \033[92mDETECTED\033[0m   | {latency_ms:.2f} ms   | {check_str}")
                cooldown = 10; prob_history.clear()

        wf.close()
        return detected_timestamps, inference_times, duration_sec

# ==========================================
# 3. MAIN RUN
# ==========================================
if __name__ == "__main__":
    if not os.path.exists(MODEL_PATH):
        print(f"❌ Chưa có file model: {MODEL_PATH}"); sys.exit(1)

    engine = OnnxStreamingEngine(model_path=MODEL_PATH)
    
    # Run Test
    dets, lats, dur = engine.run_file_test(TEST_FILE)
    res = calculate_metrics(dets, DA_FILE, TOLERANCE_MS)
    
    # Calculate Stats
    avg_latency = np.mean(lats) * 1000 if len(lats) > 0 else 0
    rtf = sum(lats) / dur if len(lats) > 0 else 0
    
    file_size_kb = os.path.getsize(MODEL_PATH) / 1024

    print("\n" + "="*60)
    print("📊 BÁO CÁO KỸ THUẬT: MULTI-ALIGNED (ONNX INT8)")
    print("="*60)
    
    if res:
        print(f"🔹 Ma trận nhầm lẫn (Confusion Matrix):")
        print(f"   TP (True Positive - Bắt đúng):    {res['TP']}  ✅")
        print(f"   TN (True Negative - Im lặng):     {res['TN']}  (Đã trừ FP)")
        print(f"   FP (False Positive - Báo ảo):     {res['FP']}  ⚠️")
        print(f"   FN (False Negative - Bỏ sót):     {res['FN']}  ❌")
        
        print(f"\n🔹 Các chỉ số hiệu năng (Model Metrics):")
        print(f"   Accuracy (Độ chính xác):          {res['Acc']:.2%}")
        print(f"   Precision (Độ chuẩn xác):         {res['Prec']:.2%}")
        print(f"   Recall (Độ nhạy):                 {res['Rec']:.2%}")
        print(f"   F1-Score (Cân bằng):              {res['F1']:.4f}")
    
    print(f"\n🔹 Tài nguyên & Tốc độ (Resource & Speed):")
    print(f"   Model Size:       {file_size_kb:.1f} KB   (INT8 Storage)")
    print(f"   Avg Latency:      {avg_latency:.2f} ms   (ONNX Runtime CPU)")
    print(f"   RTF:              {rtf:.4f}            (Real Time Factor)")
    print("="*60)