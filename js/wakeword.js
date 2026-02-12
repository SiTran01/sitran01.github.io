// Resolve paths based on script location
const scriptUrl = new URL(document.currentScript.src);
// Assuming structure: /js/wakeword.js -> root is ../
const projectRoot = new URL('../', scriptUrl).href;

class WakeWordDetector {
    constructor() {
        // Construct absolute paths relative to project root
        // This works regardless of page location
        this.modelPath = new URL('models/multi-aligned_int8.onnx', projectRoot).href;
        const workerPath = new URL('js/worker.js', projectRoot).href;

        console.log("Root:", projectRoot);
        console.log("Worker Path:", workerPath);

        this.worker = new Worker(workerPath);
        this.isListening = false;
        this.isGreetingRunning = false;

        // Handle worker messages
        this.worker.onmessage = (e) => {
            const { command, data, prob, error } = e.data;

            if (command === 'LOADED') {
                console.log("✅ Worker Loaded Model");
                document.querySelector('.ai-status').innerText = "AI Ready. Click to Start.";
                this.setupUI();
                this.scheduleGreeting();
            }
            else if (command === 'ERROR') {
                alert("AI Error: " + error);
            }
            else if (command === 'DETECTED') {
                this.triggerDetection(prob);
            }
            else if (command === 'PRE_TRIGGER') {
                console.log("⚡ DETECTED! Waiting verify...");
            }
        };
    }

    async init() {
        // Start greeting timer immediately
        this.scheduleGreeting();

        // Send Init to Worker with ABSOLUTE PATH
        // Workers run in a different scope (js/ folder), so relative paths break.
        // Converting to absolute URL fixes this.
        const absoluteModelPath = new URL(this.modelPath, window.location.href).href;

        console.log("Initializing Worker with model:", absoluteModelPath);
        this.worker.postMessage({
            command: 'INIT',
            data: { modelPath: absoluteModelPath }
        });
    }

    scheduleGreeting() {
        console.log("🕒 Greeting Timer Started (5s)...");
        const status = document.querySelector('.ai-status');
        const popup = document.querySelector('.assistant-popup');

        // Wait 5 seconds after load
        setTimeout(() => {
            console.log("⏰ Greeting Timer Executed!");
            if (this.isListening) return;

            this.isGreetingRunning = true; // Lock visibility

            // Explicitly SHOW the popup
            if (popup) popup.classList.add('active');

            if (status) status.innerText = "Hi there! I'm Si's little assistant.";

            // Show next message after 3 seconds
            setTimeout(() => {
                if (this.isListening) return;
                if (status) status.innerText = "Say 'Seven' to ask me anything!";

                // Show final instruction after 3 more seconds
                setTimeout(() => {
                    if (this.isListening) return;
                    if (status) status.innerText = "Just say 'Seven' and state your request!";

                    // Auto-hide popup after 3 seconds
                    setTimeout(() => {
                        this.isGreetingRunning = false; // Unlock
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
                // Ignore clicks during automatic greeting sequence
                if (this.isGreetingRunning) return;

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
            this.isGreetingRunning = false; // User took control
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const source = this.audioContext.createMediaStreamSource(this.stream);

            // ScriptProcessor
            this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

            this.processor.onaudioprocess = (e) => {
                // Send data to worker
                const input = e.inputBuffer.getChannelData(0);
                this.worker.postMessage({ command: 'PROCESS', data: input });
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

        // Stop all microphone tracks immediately
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.isListening = false;
        document.querySelector('.ai-status').innerText = "AI Paused";
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
