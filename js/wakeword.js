class DSP {
    constructor(sampleRate) {
        this.sampleRate = sampleRate;
        this.melFilterbank40 = this.createMelFilterbank(40, 400); // For MFCC
        this.melFilterbank64 = this.createMelFilterbank(64, 400); // For MelSpec
        this.dctMatrix = this.createDCTMatrix(40, 40);
        this.hannWindow = this.createHannWindow(400);
    }

    createHannWindow(size) {
        const window = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
        }
        return window;
    }

    // Mel Scale conversion
    hzToMel(hz) { return 2595 * Math.log10(1 + hz / 700); }
    melToHz(mel) { return 700 * (Math.pow(10, mel / 2595) - 1); }

    createMelFilterbank(n_mels, n_fft) {
        const f_min = 0;
        const f_max = this.sampleRate / 2;
        const mel_min = this.hzToMel(f_min);
        const mel_max = this.hzToMel(f_max);

        const mel_points = new Float32Array(n_mels + 2);
        for (let i = 0; i < n_mels + 2; i++) {
            mel_points[i] = this.melToHz(mel_min + (mel_max - mel_min) * i / (n_mels + 1));
        }

        const bin_points = mel_points.map(hz => Math.floor((n_fft + 1) * hz / this.sampleRate));

        // Create filterbank matrix (n_mels x (n_fft/2 + 1))
        // Since we use a custom DFT returning 201 bins (0..200 for 400 input)
        const num_bins = Math.floor(n_fft / 2) + 1;
        const filters = [];

        for (let i = 0; i < n_mels; i++) {
            const filter = new Float32Array(num_bins);
            const start = bin_points[i];
            const center = bin_points[i + 1];
            const end = bin_points[i + 2];

            for (let j = start; j < center; j++) {
                if (j >= 0 && j < num_bins) filter[j] = (j - start) / (center - start);
            }
            for (let j = center; j < end; j++) {
                if (j >= 0 && j < num_bins) filter[j] = (end - j) / (end - center);
            }
            filters.push(filter);
        }
        return filters;
    }

    createDCTMatrix(n_mfcc, n_mels) {
        const matrix = [];
        const scale = Math.sqrt(2.0 / n_mels);
        for (let i = 0; i < n_mfcc; i++) {
            const row = new Float32Array(n_mels);
            for (let j = 0; j < n_mels; j++) {
                row[j] = Math.cos((Math.PI * i * (2 * j + 1)) / (2 * n_mels));
                if (i === 0) row[j] *= Math.sqrt(1.0 / 2.0) / Math.sqrt(2.0 / n_mels) * scale; // Ortho norm fix? 
                // TorchAudio norm='ortho' usually implies typical Type-II DCT
                else row[j] *= scale;
            }
            matrix.push(row);
        }
        return matrix;
    }

    // Naive DFT for N=400 (Real input -> Complex output -> Magnitude)
    // Input: Float32Array(400), Output: Float32Array(201)
    dftMagnitude(input) {
        const N = input.length;
        const num_bins = Math.floor(N / 2) + 1;
        const output = new Float32Array(num_bins);

        for (let k = 0; k < num_bins; k++) {
            let sumReal = 0;
            let sumImag = 0;
            const omega = (2 * Math.PI * k) / N;
            for (let n = 0; n < N; n++) {
                const angle = omega * n;
                sumReal += input[n] * Math.cos(angle);
                sumImag -= input[n] * Math.sin(angle);
            }
            output[k] = sumReal * sumReal + sumImag * sumImag; // Power Spectrum |X|^2
        }
        return output;
    }

    computeFeatures(audioBuffer) {
        // audioBuffer: Float32Array of 16000 samples
        // PyTorch (torchaudio) uses center=True by default, which pads the signal.
        // To verify: 101 frames * 160 hop = 16160 coverage?
        // We need to pad the input to get 101 frames.
        // Current: 16000 samples -> (16000 - 400) / 160 + 1 = 98.5 -> 98 frames (Got 98)
        // Expected: 101 frames.

        // Pad 200 zeros on left and 200 on right (Simulate center padding roughly) ?
        // Or just pad right to ensure we get enough frames.
        // Let's verify torchaudio.transforms.MFCC/MelSpectrogram defaults.
        // Usually center=True pads n_fft // 2 on both sides. 400 // 2 = 200.
        // So 200 left, 200 right. Total 16000 + 400 = 16400.

        const paddedBuffer = new Float32Array(16400);
        paddedBuffer.set(audioBuffer, 200);

        const n_fft = 400;
        const hop_length = 160;
        const num_frames = 101; // Force 101 frames mismatch fix

        // Prepare outputs
        // MFCC: [1, 40, num_frames] -> Transpose -> [1, num_frames, 40] depends on model
        // The python code calculates: mfcc = self.mfcc_t(audio_tensor)
        // TorchAudio MFCC default shape: (..., n_mfcc, time)
        // Then standardization: mfcc.mean(dim=(1,2)) -> Standardize across n_mfcc and time?
        // Python code: mfcc.mean(dim=(1,2)) implies batch(0), channel(1), time(2).
        // Since input is (1, 16000), output of MFCC is (1, 40, 101).

        // We will compute frames first
        const mel40_frames = [];
        const mel64_frames = [];

        for (let i = 0; i < num_frames; i++) {
            const start = i * hop_length;
            let frame = audioBuffer.slice(start, start + n_fft);

            // Apply Window
            for (let j = 0; j < n_fft; j++) frame[j] *= this.hannWindow[j];

            // FFT Power
            const powerSpec = this.dftMagnitude(frame);

            // Mel 40 (for MFCC)
            const mel40 = new Float32Array(40);
            for (let m = 0; m < 40; m++) {
                let sum = 0;
                for (let k = 0; k < powerSpec.length; k++) sum += powerSpec[k] * this.melFilterbank40[m][k];
                mel40[m] = sum;
            }

            // Mel 64 (for MelSpec)
            const mel64 = new Float32Array(64);
            for (let m = 0; m < 64; m++) {
                let sum = 0;
                for (let k = 0; k < powerSpec.length; k++) sum += powerSpec[k] * this.melFilterbank64[m][k];
                mel64[m] = sum;
            }

            mel40_frames.push(mel40);
            mel64_frames.push(mel64);
        }

        // --- Compute MFCC from Mel40 ---
        // Log Mel
        const logMel40 = mel40_frames.map(frame => frame.map(v => 10 * Math.log10(v + 1e-10))); // Power to dB
        const logMel64 = mel64_frames.map(frame => frame.map(v => 10 * Math.log10(v + 1e-10)));

        // DCT for MFCC
        // MFCC shape: [n_mfcc, num_frames]
        const mfcc = new Float32Array(40 * num_frames);
        for (let t = 0; t < num_frames; t++) {
            for (let k = 0; k < 40; k++) {
                let sum = 0;
                for (let m = 0; m < 40; m++) {
                    sum += this.dctMatrix[k][m] * logMel40[t][m];
                }
                mfcc[k * num_frames + t] = sum; // Fill in (C, T) order? No, usually Flat.
                // Re-check Python: input_tensor unsqueeze(0).
                // If model expects (1, 40, T), we need flat array [40*T] representing that.
                // Standard tensor layout is Row-Major (Batch, Channel, Time).
                // So [Batch 0][Channel 0][Time 0..T], [Batch 0][Channel 1][Time 0..T]...
            }
        }

        // MelSpec shape: [64, num_frames] -> same layout
        const melspec = new Float32Array(64 * num_frames);
        for (let t = 0; t < num_frames; t++) {
            for (let k = 0; k < 64; k++) {
                melspec[k * num_frames + t] = logMel64[t][k];
            }
        }

        return { mfcc, melspec, num_frames };
    }

    standardize(data, channels, frames) {
        // Data is Float32Array representing (1, C, T)
        // Mean/Std across (C, T) -> dim=(1,2) in python
        let sum = 0;
        let sq_sum = 0;
        const size = data.length;
        for (let i = 0; i < size; i++) {
            sum += data[i];
            sq_sum += data[i] * data[i];
        }
        const mean = sum / size;
        const std = Math.sqrt((sq_sum - sum * sum / size) / size);

        const output = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            output[i] = (data[i] - mean) / (std + 1e-9);
        }
        return output;
    }
}

class WakeWordDetector {
    constructor() {
        this.modelPath = './models/multi-aligned_int8.onnx';
        this.session = null;
        this.dsp = new DSP(16000);
        this.buffer = new Float32Array(16000); // 1 sec buffer
        this.bufferIdx = 0;
        this.isListening = false;

        // Python Logic Config
        this.confidenceThreshold = 0.75; // 75% like python code
        this.probHistory = []; // maxlen=3
        this.isTriggered = false;
        this.postTriggerCount = 0;
        this.cooldown = 0;

        this.inputNames = [];
    }

    async init() {
        // Start greeting timer immediately
        this.scheduleGreeting();

        if (typeof ort === 'undefined') {
            alert("Error: ONNX Runtime library not loaded!");
            return;
        }

        try {
            console.log("Checking model path:", this.modelPath);
            const response = await fetch(this.modelPath);
            if (!response.ok) {
                throw new Error(`Model file not found! Status: ${response.status} ${response.statusText}`);
            }
            console.log("Model file found, size:", response.headers.get('content-length'));

            console.log("Loading model...");

            // CRITICAL FIX FOR GITHUB PAGES:
            // 1. Disable Multi-threading (No SharedArrayBuffer support on GH Pages)
            ort.env.wasm.numThreads = 1;

            // 2. ENABLE SIMD (by not disabling it). 
            // INT8 Quantized models often require SIMD instructions.
            // Disabling SIMD can cause the WASM backend to crash (Error 8851536).
            // ort.env.wasm.simd = true; // (Default is true)

            // Force WASM backend
            const options = {
                executionProviders: ['wasm'],
                graphOptimizationLevel: 'all'
            };

            this.session = await ort.InferenceSession.create(this.modelPath, options);
            this.inputNames = this.session.inputNames;

            console.log("✅ Model Loaded. Inputs:", this.inputNames);
            document.querySelector('.ai-status').innerText = "AI Ready. Click to Start.";
            this.setupUI();
            this.scheduleGreeting();
        } catch (e) {
            console.error("Failed to load model", e);
            let msg = e.message || String(e);

            // Append stack trace for better debugging
            if (e.stack) {
                msg += "\n\nStack:\n" + e.stack;
            }

            document.querySelector('.ai-status').innerText = "FATAL ERROR";
            // Show full details in alert
            alert("⚠️ MODEL FAILURE ⚠️\n\n" + msg);
        }
    }

    scheduleGreeting() {
        console.log("🕒 Greeting Timer Started (5s)...");
        const status = document.querySelector('.ai-status');
        const popup = document.querySelector('.assistant-popup');

        // Wait 5 seconds after load
        setTimeout(() => {
            console.log("⏰ Greeting Timer Executed!");
            if (this.isListening) {
                console.log("⚠️ Skipped greeting: isListening is true");
                return;
            }

            // Explicitly SHOW the popup
            if (popup) {
                console.log("✅ Popup found. Adding .active class...");
                popup.classList.add('active'); // This line was missing before!
            } else {
                console.error("❌ Popup element .assistant-popup NOT FOUND!");
            }

            if (status) {
                status.innerText = "Hi there! I'm Si's little assistant.";
                console.log("📝 Text updated: Hi there...");
            }

            // Show next message after 3 seconds
            setTimeout(() => {
                if (this.isListening) return;
                console.log("📝 Showing message 2...");
                if (status) status.innerText = "Say 'Seven' to ask me anything!";

                // Show final instruction after 3 more seconds
                setTimeout(() => {
                    if (this.isListening) return;
                    console.log("📝 Showing message 3...");
                    if (status) status.innerText = "Just say 'Seven' and state your request!";

                    // Auto-hide popup after 3 seconds
                    setTimeout(() => {
                        if (this.isListening) return; // Don't hide if user is interacting
                        console.log("🔒 Auto-hiding greeting popup...");
                        if (popup) popup.classList.remove('active');
                    }, 4000);

                }, 3000);
            }, 3000);
        }, 5000);
    }

    setupUI() {
        const trigger = document.getElementById('ai-trigger');
        const popup = document.querySelector('.assistant-popup');

        // 1. Toggle Button
        trigger.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent document listener from firing
            if (!this.isListening) this.startListening();
            else this.stopListening();
        });

        // 2. Click Outside -> Close Popup & Stop Mic
        document.addEventListener('click', (e) => {
            // Check if click is inside the popup or the trigger bubble
            const isInside = e.target.closest('.assistant-popup') || e.target.closest('#ai-trigger');

            if (!isInside) {
                // Click is outside
                const isPopupActive = popup && popup.classList.contains('active');

                if (this.isListening || isPopupActive) {
                    console.log("Click outside detected. Stopping AI & Closing...");
                    this.stopListening();
                    if (popup) popup.classList.remove('active');
                }
            }
        });
    }

    async startListening() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const source = this.audioContext.createMediaStreamSource(stream);

            // ScriptProcessor (Deprecated but works for simple demo)
            // Buffer size 16384 ~ 1s? No, we need frequent updates.
            // Python used 0.1s chunks (1600 samples). 2048 is closest power of 2.
            this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

            this.processor.onaudioprocess = (e) => {
                const input = e.inputBuffer.getChannelData(0);
                this.processAudioChunk(input);
            };

            source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            this.isListening = true;
            document.querySelector('.assistant-popup').classList.add('active'); // Show popup
            document.querySelector('.ai-status').innerText = "Listening...";
            document.querySelector('.glow-ring').classList.add('active'); // Add glow
        } catch (e) {
            console.error("Mic Error", e);
            alert("Please allow microphone access");
        }
    }

    stopListening() {
        if (this.processor) this.processor.disconnect();
        if (this.audioContext) this.audioContext.close();
        this.isListening = false;
        document.querySelector('.ai-status').innerText = "AI Paused";
    }

    async processAudioChunk(chunk) {
        // OPTIMIZATION: In-place buffer shift (No new allocations)
        // Keeps the last (16000 - chunk.length) samples effectively

        if (chunk.length >= 16000) {
            this.buffer.set(chunk.slice(chunk.length - 16000));
        } else {
            // Shift left: move data from [chunk.length] to [0]
            this.buffer.copyWithin(0, chunk.length);
            // Append new data at end
            this.buffer.set(chunk, 16000 - chunk.length);
        }

        // Skip inference if cooldown
        if (this.cooldown > 0) {
            this.cooldown--;
            return;
        }

        // Run Inference
        await this.runInference();
    }

    async runInference() {
        const { mfcc, melspec, num_frames } = this.dsp.computeFeatures(this.buffer);
        const mfcc_norm = this.dsp.standardize(mfcc);
        const mel_norm = this.dsp.standardize(melspec);

        const tensorMFCC = new ort.Tensor('float32', mfcc_norm, [1, 40, num_frames]);
        const tensorMel = new ort.Tensor('float32', mel_norm, [1, 64, num_frames]);

        const feeds = {};
        feeds[this.inputNames[0]] = tensorMFCC;
        if (this.inputNames.length > 1) {
            feeds[this.inputNames[1]] = tensorMel;
        }

        try {
            const results = await this.session.run(feeds);
            const outputName = this.session.outputNames[0];
            const output = results[outputName].data;

            // 1. Softmax
            const probs = this.softmax(output);

            // 2. Prob History (Moving Average)
            this.probHistory.push(probs);
            if (this.probHistory.length > 3) this.probHistory.shift();

            // Calculate Average Prob
            // probs is [4] (Noise, Center, Start, End)
            // We need avg of index 1 (Center/Seven)
            let avgProbCenter = 0;
            for (let p of this.probHistory) avgProbCenter += p[1];
            avgProbCenter /= this.probHistory.length;

            // if (avgProbCenter > 0.1) console.log(`Prob: ${probs[1].toFixed(2)} | Avg: ${avgProbCenter.toFixed(2)}`);

            // 3. Trigger Logic
            if (!this.isTriggered) {
                if (avgProbCenter >= this.confidenceThreshold) {
                    console.log("⚡ DETECTED! Waiting verify...");
                    this.isTriggered = true;
                    this.postTriggerCount = 0;
                }
            } else {
                this.postTriggerCount++;
                if (this.postTriggerCount >= 1) {
                    this.triggerDetection(avgProbCenter);

                    // Reset
                    this.buffer = new Float32Array(16000); // Clear audio buffer
                    this.probHistory = [];
                    this.isTriggered = false;
                    this.cooldown = 10;
                }
            }

        } catch (e) {
            console.error("Inference Error", e);
        }
    }

    softmax(arr) {
        const max = Math.max(...arr);
        const exps = arr.map(x => Math.exp(x - max));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(x => x / sum);
    }

    triggerDetection(prob) {
        console.log("WAKE WORD DETECTED!", prob);
        const status = document.querySelector('.ai-status');
        status.innerText = "SEVEN Detected!";
        status.style.color = "#00f3ff";
        status.style.textShadow = "0 0 10px #00f3ff";

        const bubble = document.querySelector('.assistant-bubble');
        bubble.style.transform = "scale(1.2)";
        setTimeout(() => {
            status.innerText = "Listening...";
            status.style.color = "rgba(255,255,255,0.7)";
            status.style.textShadow = "none";
            bubble.style.transform = "scale(1)";
        }, 2000);
    }
}

// Start
window.onload = () => {
    const detector = new WakeWordDetector();
    detector.init();
};
