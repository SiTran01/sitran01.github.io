importScripts("https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js");

// Fix WASM path for Worker context
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/";

// Set ORT logic
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;

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
                if (i === 0) row[j] *= Math.sqrt(1.0 / 2.0) / Math.sqrt(2.0 / n_mels) * scale;
                else row[j] *= scale;
            }
            matrix.push(row);
        }
        return matrix;
    }

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
            output[k] = sumReal * sumReal + sumImag * sumImag;
        }
        return output;
    }

    computeFeatures(audioBuffer) {
        const paddedBuffer = new Float32Array(16400);
        paddedBuffer.set(audioBuffer, 200);

        const n_fft = 400;
        const hop_length = 160;
        const num_frames = 101;

        const mel40_frames = [];
        const mel64_frames = [];

        for (let i = 0; i < num_frames; i++) {
            const start = i * hop_length;
            let frame = audioBuffer.slice(start, start + n_fft);

            for (let j = 0; j < n_fft; j++) frame[j] *= this.hannWindow[j];
            const powerSpec = this.dftMagnitude(frame);

            const mel40 = new Float32Array(40);
            for (let m = 0; m < 40; m++) {
                let sum = 0;
                for (let k = 0; k < powerSpec.length; k++) sum += powerSpec[k] * this.melFilterbank40[m][k];
                mel40[m] = sum;
            }

            const mel64 = new Float32Array(64);
            for (let m = 0; m < 64; m++) {
                let sum = 0;
                for (let k = 0; k < powerSpec.length; k++) sum += powerSpec[k] * this.melFilterbank64[m][k];
                mel64[m] = sum;
            }

            mel40_frames.push(mel40);
            mel64_frames.push(mel64);
        }

        const logMel40 = mel40_frames.map(frame => frame.map(v => 10 * Math.log10(v + 1e-10)));
        const logMel64 = mel64_frames.map(frame => frame.map(v => 10 * Math.log10(v + 1e-10)));

        const mfcc = new Float32Array(40 * num_frames);
        for (let t = 0; t < num_frames; t++) {
            for (let k = 0; k < 40; k++) {
                let sum = 0;
                for (let m = 0; m < 40; m++) {
                    sum += this.dctMatrix[k][m] * logMel40[t][m];
                }
                mfcc[k * num_frames + t] = sum;
            }
        }

        const melspec = new Float32Array(64 * num_frames);
        for (let t = 0; t < num_frames; t++) {
            for (let k = 0; k < 64; k++) {
                melspec[k * num_frames + t] = logMel64[t][k];
            }
        }

        return { mfcc, melspec, num_frames };
    }

    standardize(data) {
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

// --- WORKER LOGIC ---

let session = null;
let inputNames = [];
let dsp = new DSP(16000);
let buffer = new Float32Array(16000);

// Logic State
let probHistory = [];
let isTriggered = false;
let postTriggerCount = 0;
let cooldown = 0;
const confidenceThreshold = 0.75;

async function softmax(arr) {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sum);
}

self.onmessage = async (e) => {
    const { command, data } = e.data;

    if (command === 'INIT') {
        try {
            console.log("Worker: Loading model from", data.modelPath);
            const options = {
                executionProviders: ['wasm'],
                graphOptimizationLevel: 'all'
            };
            session = await ort.InferenceSession.create(data.modelPath, options);
            inputNames = session.inputNames;
            self.postMessage({ command: 'LOADED', inputNames });
        } catch (err) {
            console.error(err);
            self.postMessage({ command: 'ERROR', error: err.message });
        }
    }

    if (command === 'PROCESS') {
        if (!session) return;
        const chunk = data;

        // Update Buffer
        if (chunk.length >= 16000) {
            buffer.set(chunk.slice(chunk.length - 16000));
        } else {
            buffer.copyWithin(0, chunk.length);
            buffer.set(chunk, 16000 - chunk.length);
        }

        if (cooldown > 0) {
            cooldown--;
            return;
        }

        try {
            // Run Inference
            const { mfcc, melspec, num_frames } = dsp.computeFeatures(buffer);
            const mfcc_norm = dsp.standardize(mfcc);
            const mel_norm = dsp.standardize(melspec);

            const tensorMFCC = new ort.Tensor('float32', mfcc_norm, [1, 40, num_frames]);
            const tensorMel = new ort.Tensor('float32', mel_norm, [1, 64, num_frames]);

            const feeds = {};
            feeds[inputNames[0]] = tensorMFCC;
            if (inputNames.length > 1) {
                feeds[inputNames[1]] = tensorMel;
            }

            const results = await session.run(feeds);
            const outputName = session.outputNames[0];
            const output = results[outputName].data;
            const probs = await softmax(output);

            probHistory.push(probs);
            if (probHistory.length > 3) probHistory.shift();

            let avgProbCenter = 0;
            for (let p of probHistory) avgProbCenter += p[1];
            avgProbCenter /= probHistory.length;

            if (avgProbCenter > 0.1) {
                // Optional: Send debug info back?
                // self.postMessage({ command: 'DEBUG', prob: avgProbCenter });
            }

            if (!isTriggered) {
                if (avgProbCenter >= confidenceThreshold) {
                    isTriggered = true;
                    postTriggerCount = 0;
                    self.postMessage({ command: 'PRE_TRIGGER' });
                }
            } else {
                postTriggerCount++;
                if (postTriggerCount >= 1) {
                    // Confirmed
                    self.postMessage({ command: 'DETECTED', prob: avgProbCenter });

                    // Reset
                    buffer = new Float32Array(16000); // Clear buffer
                    probHistory = [];
                    isTriggered = false;
                    cooldown = 10;
                }
            }

        } catch (err) {
            console.error("Worker Inference Error", err);
        }
    }
};
