const buttons = document.querySelectorAll('#section2 .button');
const descBox = document.getElementById('service-description');
const square = document.getElementById('square');
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let currentVisible = null;

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
  if (isMobile) {
    button.addEventListener('click', () => {
      const squareRect = square.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const squareCenterX = squareRect.left + squareRect.width / 2;
      const buttonCenterX = buttonRect.left + buttonRect.width / 2;
      const direction = buttonCenterX < squareCenterX ? 'right' : 'left';

      // Nếu đang hiển thị rồi và bấm lại thì ẩn
      if (currentVisible === button) {
        descBox.classList.remove('visible-left', 'visible-right');
        currentVisible = null;
        return;
      }

      currentVisible = button;
      updateDescription(button);
      descBox.style.top = `${squareRect.top + window.scrollY}px`;

      descBox.classList.remove('visible-left', 'visible-right');
      if (direction === 'left') {
        descBox.style.left = `${squareRect.left + window.scrollX}px`;
        descBox.classList.add('visible-right');
      } else {
        const descWidth = descBox.offsetWidth;
        descBox.style.left = `${squareRect.right + window.scrollX - descWidth}px`;
        descBox.classList.add('visible-left');
      }
    });
  } else {
    // PC: hover behavior
    button.addEventListener('mouseenter', () => {
      const squareRect = square.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const squareCenterX = squareRect.left + squareRect.width / 2;
      const buttonCenterX = buttonRect.left + buttonRect.width / 2;
      const direction = buttonCenterX < squareCenterX ? 'right' : 'left';

      updateDescription(button);
      descBox.style.top = `${squareRect.top + window.scrollY}px`;

      descBox.classList.remove('visible-left', 'visible-right');
      if (direction === 'left') {
        descBox.style.left = `${squareRect.left + window.scrollX}px`;
        descBox.classList.add('visible-right');
      } else {
        const descWidth = descBox.offsetWidth;
        descBox.style.left = `${squareRect.right + window.scrollX - descWidth}px`;
        descBox.classList.add('visible-left');
      }
    });

    button.addEventListener('mouseleave', () => {
      descBox.classList.remove('visible-left', 'visible-right');
    });
  }
});
