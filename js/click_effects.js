import { updateDescription } from './description_box.js';
import { applySVGGradient } from './svg_gradient.js';

export function handleClickEffects() {
  const buttons = document.querySelectorAll('#section2 .button');
  const descBox = document.getElementById('service-description');
  const square = document.getElementById('square');
  const section3 = document.getElementById('section3');
  const section1 = document.getElementById('section1');
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  let currentClickedButton = null;
  let descTimeout = null;
  let direction = null;

  buttons.forEach(button => {
    button.addEventListener('click', () => {

      // Reset nút cũ
      if (currentClickedButton) {
        currentClickedButton.classList.remove('active');
        currentClickedButton.classList.add('button-reverse');
        setTimeout(() => {
          currentClickedButton.classList.remove('button-reverse');
        }, 600);
        buttons.forEach(btn => btn.classList.remove('disabled'));
        section3.classList.remove('disabled');
      }

      // Kích hoạt nút mới
      button.classList.add('active');
      const icon = button.querySelector('.icon-gradient');
      if (icon) icon.style.animation = 'gradientText 2.5s forwards';

      // Gán lại button hiện tại
      setTimeout(() => {
        currentClickedButton = button;
        applySVGGradient(button.querySelector('.notion-icon'), 'url(#icon-gradient-hover)');
        buttons.forEach(btn => btn.classList.toggle('disabled', btn !== button));
        section3.classList.add('disabled');
        section1.classList.add('disabled');
        square.classList.add('square-disabled');
      }, 1000);

      // Reset mô tả
      if (descTimeout) clearTimeout(descTimeout);
      descBox.classList.remove('visible-left', 'visible-right', 'desc-overlap', 'desc-overlap', 'focus-desc');

      // Tính hướng
      const squareRect = square.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const squareCenterX = squareRect.left + squareRect.width / 2;
      const buttonCenterX = buttonRect.left + buttonRect.width / 2;
      direction = buttonCenterX < squareCenterX ? 'right' : 'left';

      // Square nghiêng
      square.classList.remove('tilt-left', 'tilt-right');
      square.classList.add(direction === 'left' ? 'tilt-right' : 'tilt-left');

      // Hiện mô tả
      descTimeout = setTimeout(() => {
        updateDescription(button, descBox);

        const descWidth = descBox.offsetWidth;
        const windowWidth = window.innerWidth;
        const spaceLeft = squareRect.left;
        const spaceRight = windowWidth - squareRect.right;

        descBox.style.top = `${squareRect.top + window.scrollY}px`;

        if (direction === 'left') {
          if (spaceRight >= descWidth) {
            // Trượt ra phải (square bên trái)
            descBox.style.left = `${squareRect.left + window.scrollX}px`;
            descBox.classList.add('visible-right');
          } else {
            // Không đủ chỗ → đè lên square
            descBox.style.left = `${squareRect.left + window.scrollX}px`;
            descBox.classList.add('desc-overlap');
          }
        } else {
          if (spaceLeft >= descWidth) {
            // Trượt ra trái (square bên phải)
            descBox.style.left = `${squareRect.right + window.scrollX - descWidth}px`;
            descBox.classList.add('visible-left');
          } else {
            // Không đủ chỗ → đè lên square
            descBox.style.left = `${squareRect.left + window.scrollX}px`;
            descBox.classList.add('desc-overlap');
          }
        }

        descBox.style.zIndex = '2';

        setTimeout(() => {
          descBox.classList.add('focus-desc');
        }, 30);

        // Reset nghiêng sau khi trượt
        setTimeout(() => {
          square.classList.remove('tilt-left', 'tilt-right');
        }, 450);
      }, 400);
    });
  });

  // Reset toàn bộ khi click ra ngoài
  document.addEventListener('click', (e) => {
  if (
    !descBox.contains(e.target) &&
    ![...buttons].some(btn => btn.contains(e.target))
  ) {
    if (!currentClickedButton) return;

    console.log('👉 Clicked outside — resetting UI');

    // Reset button
    currentClickedButton.classList.remove('active');
    const icon = currentClickedButton.querySelector('.icon-gradient');
    if (icon) icon.style.animation = '';
    applySVGGradient(currentClickedButton.querySelector('.notion-icon'), 'url(#icon-gradient)');
    currentClickedButton.classList.add('button-reverse');
    setTimeout(() => {
      currentClickedButton.classList.remove('button-reverse');
    }, 600);

    // Trượt mô tả (chạy TRƯỚC square bounce)
    const isLeft = descBox.classList.contains('visible-left');
    const isRight = descBox.classList.contains('visible-right');
    const isOverlap = descBox.classList.contains('desc-overlap');
    descBox.classList.remove('focus-desc');

    if (isOverlap) {
      descBox.classList.add('exit-fade');

      // 🔥 Xóa exit-fade sau 400ms
      setTimeout(() => {
        descBox.classList.remove('exit-fade');
      }, 400);

    } else {
      if (isLeft) {
        descBox.classList.add('exit-left');
      } else if (isRight) {
        descBox.classList.add('exit-right');
      }
    }

    descBox.style.zIndex = '1';

    setTimeout(() => {
      descBox.classList.remove(
        'visible-left', 'visible-right',
        'desc-overlap',
        'exit-left', 'exit-right'
      );
      descBox.style.left = '';
      descBox.style.top = '';
    }, 400);

    // Square nghiêng và bounce (sau phần mô tả)
    square.classList.remove('tilt-left', 'tilt-right', 'square-bounce');
    if (direction === 'left') {
      square.classList.add('tilt-right');
    } else if (direction === 'right') {
      square.classList.add('tilt-left');
    }

    setTimeout(() => {
      square.classList.remove('tilt-left', 'tilt-right');
      square.classList.add('square-bounce');
    }, 800);

    // Gỡ mờ
    square.classList.remove('square-disabled');
    section3.classList.remove('disabled');
    section1.classList.remove('disabled');
    buttons.forEach(btn => btn.classList.remove('disabled'));

    currentClickedButton = null;
  }
});
}
