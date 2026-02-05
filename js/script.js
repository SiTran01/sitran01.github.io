document.addEventListener('DOMContentLoaded', function () {
    console.log("Website loaded - Clean 3D Effect Mode");

    // ==========================================
    // 1. TYPING TEXT EFFECT
    // ==========================================
    const typingText = document.querySelector('.type-effect');
    if (typingText) {
        const words = ["Embedded Engineer", "IoT Developer", "Hardware Lover", "Tech Enthusiast"];
        let wordIndex = 0;
        let charIndex = 0;
        let isDeleting = false;

        function type() {
            const currentWord = words[wordIndex];
            if (isDeleting) {
                typingText.textContent = currentWord.substring(0, charIndex - 1);
                charIndex--;
            } else {
                typingText.textContent = currentWord.substring(0, charIndex + 1);
                charIndex++;
            }

            if (!isDeleting && charIndex === currentWord.length) {
                isDeleting = true;
                setTimeout(type, 2000);
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                wordIndex = (wordIndex + 1) % words.length;
                setTimeout(type, 500);
            } else {
                setTimeout(type, isDeleting ? 100 : 200);
            }
        }
        type();
    }

    // ==========================================
    // 2. PARTICLE BACKGROUND EFFECT
    // ==========================================
    const canvas = document.getElementById('canvas-bg');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        let particlesArray = [];

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.directionX = (Math.random() * 0.4) - 0.2;
                this.directionY = (Math.random() * 0.4) - 0.2;
                this.size = Math.random() * 2;
                this.color = '#00f3ff';
            }
            update() {
                if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
                if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
                this.x += this.directionX;
                this.y += this.directionY;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        function initParticles() {
            particlesArray = [];
            let numberOfParticles = (canvas.height * canvas.width) / 9000;
            for (let i = 0; i < numberOfParticles; i++) {
                particlesArray.push(new Particle());
            }
        }

        function connectParticles() {
            let opacityValue = 1;
            for (let a = 0; a < particlesArray.length; a++) {
                for (let b = a; b < particlesArray.length; b++) {
                    let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x)) +
                        ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
                    if (distance < (canvas.width / 7) * (canvas.height / 7)) {
                        opacityValue = 1 - (distance / 20000);
                        ctx.strokeStyle = 'rgba(0, 243, 255,' + opacityValue * 0.2 + ')';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                        ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                        ctx.stroke();
                    }
                }
            }
        }

        function animateParticles() {
            requestAnimationFrame(animateParticles);
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
                particlesArray[i].draw();
            }
            connectParticles();
        }

        initParticles();
        animateParticles();

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        });
    }

    // ==========================================
    // 3. VIRTUAL ASSISTANT LOGIC
    // ==========================================
    const aiTrigger = document.getElementById('ai-trigger');
    const aiPopup = document.getElementById('ai-popup');
    const closePopup = document.getElementById('close-popup');

    if (aiTrigger && aiPopup && closePopup) {
        aiTrigger.addEventListener('click', () => {
            aiPopup.classList.toggle('active');
            const icon = aiTrigger.querySelector('i');
            if (icon) icon.classList.toggle('fa-beat');
        });

        closePopup.addEventListener('click', () => {
            aiPopup.classList.remove('active');
            const icon = aiTrigger.querySelector('i');
            if (icon) icon.classList.remove('fa-beat');
        });

        document.addEventListener('click', (e) => {
            if (!aiTrigger.contains(e.target) && !aiPopup.contains(e.target)) {
                aiPopup.classList.remove('active');
                const icon = aiTrigger.querySelector('i');
                if (icon) icon.classList.remove('fa-beat');
            }
        });
    }

    // REMOVED 3D TILT MOUSEMOVE HERE TO AVOID CONFLICT
});


