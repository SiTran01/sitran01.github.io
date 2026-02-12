document.addEventListener('DOMContentLoaded', function () {
    const experienceContainer = document.querySelector('.experience-timeline');

    if (!experienceContainer) return;

    fetch('data/experience.json')
        .then(response => response.json())
        .then(experiences => {
            renderExperience(experiences, experienceContainer);
        })
        .catch(error => console.error('Error loading experience:', error));

    function renderExperience(experiences, container) {
        container.innerHTML = '';

        experiences.forEach((exp, index) => {
            const item = document.createElement('div');
            // Add 'left' or 'right' class based on index
            const sideClass = index % 2 === 0 ? 'left' : 'right';
            item.className = `exp-item ${sideClass}`;

            // Create list items for description
            const descList = exp.description.map(desc => `<li>${desc}</li>`).join('');

            item.innerHTML = `
                <div class="exp-dot"></div>
                <div class="exp-line-connector"></div>
                <div class="exp-content glass">
                    <div class="exp-date">${exp.period}</div>
                    <h3>${exp.role}</h3>
                    <h4>${exp.company}</h4>
                    <ul>
                        ${descList}
                    </ul>
                </div>
            `;
            container.appendChild(item);
        });

        // Add Scroll Animation
        setupObserver();
    }

    function setupObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target); // Animates once
                }
            });
        }, { threshold: 0.2 });

        document.querySelectorAll('.exp-item').forEach(item => {
            observer.observe(item);
        });
    }
});
