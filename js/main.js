const buttons = document.querySelectorAll('#section2 .button');
const descBox = document.getElementById('service-description');
const square = document.getElementById('square');
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let currentHoveredButton = null;
let currentVisible = null;
let descTimeout = null;

function updateDescription(button) {
  const img = button.dataset.img || '';
  const title = button.dataset.title || '';
  const desc = button.dataset.desc || '';
  const subtitle = button.dataset.subtitle || '';
  const features = JSON.parse(button.dataset.features || '[]');

  descBox.innerHTML = `
    <div class="desc-content">
      ${img ? `<img src="${img}" alt="${title}" class="desc-img">` : ''}
      <h1 class="desc-title">${title}</h1>
      <p class="desc-desc">${desc}</p>
      ${subtitle ? `<h2 class="desc-subtitle">${subtitle}</h2>` : ''}
      <ul class="desc-features">
        ${features.map(f => `<li>${f}</li>`).join('')}
      </ul>
    </div>
  `;
}

buttons.forEach(button => {
  let iconTimeout;

  button.addEventListener('mouseenter', () => {
    if (isMobile) return;

    currentHoveredButton = button;

    // Square hover effect
    square.classList.add('square-active');

    // Xử lý icon SVG gradient (sau 450ms)
    const svg = button.querySelector('.notion-icon');
    if (svg) {
      iconTimeout = setTimeout(() => {
        svg.querySelectorAll('path').forEach(path => {
          if (path.getAttribute('fill')?.startsWith('url')) {
            path.setAttribute('fill', 'url(#icon-gradient-hover)');
          }
        });
      }, 450);
    }

    // Mô tả chi tiết (descBox)
    const squareRect = square.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const squareCenterX = squareRect.left + squareRect.width / 2;
    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    const direction = buttonCenterX < squareCenterX ? 'right' : 'left';

    descBox.classList.remove('visible-left', 'visible-right');
    if (descTimeout) clearTimeout(descTimeout);

    descTimeout = setTimeout(() => {
      if (currentHoveredButton !== button) return;

      updateDescription(button);
      descBox.style.top = `${squareRect.top + window.scrollY}px`;

      if (direction === 'left') {
        descBox.style.left = `${squareRect.left + window.scrollX}px`;
        descBox.classList.add('visible-right');
      } else {
        const descWidth = descBox.offsetWidth;
        descBox.style.left = `${squareRect.right + window.scrollX - descWidth}px`;
        descBox.classList.add('visible-left');
      }

      currentVisible = button;
    }, 400);

    button.classList.remove('button-reverse');
  });

  button.addEventListener('mouseleave', () => {
    currentHoveredButton = null;

    // Square reset
    square.classList.remove('square-active');

    // Huỷ đổi màu icon nếu chưa tới 450ms
    clearTimeout(iconTimeout);
    const svg = button.querySelector('.notion-icon');
    if (svg) {
      svg.querySelectorAll('path').forEach(path => {
        if (path.getAttribute('fill')?.startsWith('url')) {
          path.setAttribute('fill', 'url(#icon-gradient)');
        }
      });
    }

    // Ẩn box mô tả
    descBox.classList.remove('visible-left', 'visible-right');

    // Reset border animation
    const borders = button.querySelectorAll(
      '.border-blue, .border-blue-bottom, .border-pink, .border-pink-top'
    );
    borders.forEach(el => {
      el.style.animation = 'none';
      void el.offsetWidth; // trigger reflow
      el.style.animation = '';
    });

    // Reverse hiệu ứng border
    button.classList.add('button-reverse');
    setTimeout(() => {
      button.classList.remove('button-reverse');
    }, 300);
  });
});
