document.addEventListener('DOMContentLoaded', function () {
    const projectsGrid = document.querySelector('.projects-grid');
    const timelineWrapper = document.querySelector('.timeline-wrapper');
    const skillCards = document.querySelectorAll('.skill-card');

    if (!projectsGrid && !timelineWrapper && skillCards.length === 0) return;

    // Determine path to data file based on current location
    const isPagesDir = window.location.pathname.includes('/pages/');
    const dataPath = isPagesDir ? '../data/projects.json' : 'data/projects.json';



    // Initialize Scroll Observer
    const observerOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px" // Trigger slightly before bottom
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Animate once
            }
        });
    }, observerOptions);

    // Observer for Static Elements (Skills, About, etc.)
    // Observer for Static Elements (Skills, About, Contact Buttons)
    document.querySelectorAll('.card, .bio-btn').forEach(el => {
        el.addEventListener('animationend', () => {
            el.classList.add('loaded');
        });
        observer.observe(el);
    });

    document.querySelectorAll('.skill-card').forEach((el, index) => {
        // Stagger skill cards
        el.style.animationDelay = `${index * 100}ms`; // Slightly slower stagger

        // Add loaded class after animation ends to enable hover transition
        el.addEventListener('animationend', () => {
            el.classList.add('loaded');
        });

        observer.observe(el);
    });

    fetch(dataPath)
        .then(response => response.json())
        .then(projects => {
            // Sort projects by date (newest first)
            projects.sort((a, b) => new Date(b.date) - new Date(a.date));

            if (projectsGrid) {
                renderHomeProjects(projects.slice(0, 3), projectsGrid);
            }

            if (timelineWrapper) {
                renderTimelineProjects(projects, timelineWrapper);
            }
        })
        .catch(error => console.error('Error loading projects:', error));

    function renderHomeProjects(projects, container) {
        container.innerHTML = '';
        projects.forEach((project, index) => {
            const card = document.createElement('div');
            card.classList.add('project-card'); // Base class
            // Stagger animation delay
            card.style.transitionDelay = `${index * 100}ms`;

            // Generate tech stack HTML
            const techStackHtml = project.tags ? project.tags.map(tag => `<span>${tag}</span>`).join(' ') : '';

            card.innerHTML = `
                <div class="project-thumb">
                    <img src="${project.image}" alt="${project.title}">
                </div>
                <div class="project-info">
                    <h3>${project.title}</h3>
                    <div class="tech-stack">${techStackHtml}</div>
                    <p>${project.description}</p>
                    <a href="pages/projects.html" class="btn-sm">View Details <i class="fas fa-info-circle"></i></a>
                </div>
            `;
            container.appendChild(card);
            observer.observe(card); // Observe immediately after creation
        });
    }



    function renderTimelineProjects(projects, container) {
        // Keep the timeline line definition
        container.innerHTML = '<div class="timeline-line"></div>';

        projects.forEach(project => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.dataset.category = project.category || 'all';

            // correct image path for pages dir
            const imagePath = `../${project.image}`;

            // Generate tech tags HTML
            const techTagsHtml = project.tags.map(tag => `<span>${tag}</span>`).join('');

            item.innerHTML = `
                <div class="timeline-marker">
                    <span class="timeline-date">${project.displayDate}</span>
                    <div class="timeline-dot"></div>
                </div>

                <div class="timeline-content glass-panel">
                    <div class="project-visual">
                        <img src="${imagePath}" alt="${project.title}">
                        <div class="visual-overlay"></div>
                    </div>
                    <div class="project-details">
                        <h2 class="project-title">${project.title}</h2>
                        <div class="tech-tags">
                            ${techTagsHtml}
                        </div>
                        <p class="description">
                            ${project.description}
                        </p>
                        <div class="stats-row">
                            <div class="stat">
                                <i class="fas fa-tag"></i> <span>${project.category.toUpperCase()}</span>
                            </div>
                        </div>
                        <a href="#" class="btn-glitch">VIEW DETAILS</a>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });

        // Re-attach observer for animation if needed
        if (typeof attachTimelineObserver === 'function') {
            attachTimelineObserver();
        } else {
            // Re-implement the observer logic since it was inside script tag in HTML
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('active');
                    }
                });
            }, { threshold: 0.15 });

            document.querySelectorAll('.timeline-item').forEach(item => {
                observer.observe(item);
            });
        }
    }
});
