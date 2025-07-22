const buttons = document.querySelectorAll('#section2 .button');
const descBox = document.getElementById('service-description');
const square = document.getElementById('square');
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let currentVisible = null;
let descTimeout = null;
let currentHoveredButton = null;

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

// Xử lý mobile
buttons.forEach(button => {
  if (!isMobile) {
    button.addEventListener('mouseenter', () => {
      currentHoveredButton = button;

      const squareRect = square.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const squareCenterX = squareRect.left + squareRect.width / 2;
      const buttonCenterX = buttonRect.left + buttonRect.width / 2;
      const direction = buttonCenterX < squareCenterX ? 'right' : 'left';

      // Nếu đang hiển thị → ẩn trước
      descBox.classList.remove('visible-left', 'visible-right');

      // Huỷ timeout cũ (nếu có)
      if (descTimeout) clearTimeout(descTimeout);

      // Đặt timeout để hiển thị sau khi ẩn xong (400ms)
      descTimeout = setTimeout(() => {
        // Kiểm tra xem chuột còn đang ở button này không
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

      // Bỏ class reverse nếu đang có
      button.classList.remove('button-reverse');
    });

    button.addEventListener('mouseleave', () => {
      currentHoveredButton = null;

      descBox.classList.remove('visible-left', 'visible-right');

      const borders = button.querySelectorAll(
        '.border-blue, .border-blue-bottom, .border-pink, .border-pink-top'
      );
      borders.forEach(el => {
        el.style.animation = 'none';
        void el.offsetWidth; // force reflow
        el.style.animation = '';
      });

      button.classList.add('button-reverse');
      setTimeout(() => {
        button.classList.remove('button-reverse');
      }, 300);
    });
  }
});
