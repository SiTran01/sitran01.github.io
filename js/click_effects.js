import { updateDescription } from './description_box.js';
import { applySVGGradient } from './svg_gradient.js';

export function handleClickEffects() {
  const buttons = document.querySelectorAll('#section2 .button');
  const descBox = document.getElementById('service-description');
  const square = document.getElementById('square');
  const section3 = document.getElementById('section3');
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  let currentClickedButton = null;
  let descTimeout = null;
  let direction; // 🟢 cần dùng lại khi click ra ngoài

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      if (isMobile) return;
      if (currentClickedButton === button) return;

      // 1. Reset button trước đó
      if (currentClickedButton) {
        currentClickedButton.classList.remove('active');
        currentClickedButton.classList.add('button-reverse');
        setTimeout(() => {
          currentClickedButton.classList.remove('button-reverse');
        }, 600);

        // Xóa hiệu ứng mờ
        buttons.forEach(btn => btn.classList.remove('disabled'));
        section3.classList.remove('disabled');
      }

      button.classList.add('active');
      const iconEl = button.querySelector('.icon-gradient');
      if (iconEl) {
        iconEl.style.animation = 'gradientText 2.5s forwards';
      }

      // const labelEl = button.querySelector('.label');
      // if (labelEl) {
      //   labelEl.style.animation = 'gradientText 2.0s forwards';
      // }


      // 2. Gán button hiện tại
      setTimeout(() => {
        currentClickedButton = button;
        
        
        // Gradient cho icon
        applySVGGradient(button.querySelector('.notion-icon'), 'url(#icon-gradient-hover)');

        // Làm mờ các button khác
        buttons.forEach(btn => {
          if (btn !== button) {
            btn.classList.add('disabled');
          } else {
            btn.classList.remove('disabled');
          }
        });

        section3.classList.add('disabled');
        square.classList.add('square-disabled');
        document.getElementById('section1').classList.add('disabled');
      }, 800);

      // 3. Reset descBox
      descBox.classList.remove('visible-left', 'visible-right', 'focus-desc');
      if (descTimeout) clearTimeout(descTimeout);

      // 4. Tính hướng
      const squareRect = square.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const squareCenterX = squareRect.left + squareRect.width / 2;
      const buttonCenterX = buttonRect.left + buttonRect.width / 2;
      direction = buttonCenterX < squareCenterX ? 'right' : 'left';

      // 5. Square nghiêng
      square.classList.remove('tilt-left', 'tilt-right');
      square.classList.add(direction === 'left' ? 'tilt-right' : 'tilt-left');

      // 6. Hiện mô tả
      descTimeout = setTimeout(() => {
        updateDescription(button, descBox);
        descBox.style.top = `${squareRect.top + window.scrollY}px`;

        if (direction === 'left') {
          descBox.style.left = `${squareRect.left + window.scrollX}px`;
          descBox.classList.add('visible-right');
        } else {
          const descWidth = descBox.offsetWidth;
          descBox.style.left = `${squareRect.right + window.scrollX - descWidth}px`;
          descBox.classList.add('visible-left');
        }

        descBox.style.zIndex = '2';

        // Đợi 1 frame rồi mới add hiệu ứng focus
        setTimeout(() => {
          descBox.classList.add('focus-desc');
        }, 30);

        // Reset nghiêng square sau khi trượt xong
        setTimeout(() => {
          square.classList.remove('tilt-left', 'tilt-right');
        }, 450);
      }, 400);
    });
  });

  // 7. Click ra ngoài để reset toàn bộ
document.addEventListener('click', (e) => {
  if (
    !descBox.contains(e.target) &&
    ![...buttons].some(btn => btn.contains(e.target))
  ) {
    if (!currentClickedButton) return; // 🛑 Không có button đang active thì thoát

    console.log('👉 Clicked outside — resetting UI');

    // 1. Reset nút đang click
if (currentClickedButton) {
  currentClickedButton.classList.remove('active');
  const icon = currentClickedButton.querySelector('.icon-gradient');
  // const label = currentClickedButton.querySelector('.label');
  if (icon) icon.style.animation = '';
  // Gradient cho icon
  applySVGGradient(currentClickedButton.querySelector('.notion-icon'), 'url(#icon-gradient)');

  // if (label) label.style.animation = '';
  currentClickedButton.classList.add('button-reverse');
  setTimeout(() => {
    currentClickedButton.classList.remove('button-reverse');
  }, 600);
}

// 2. Square nghiêng đúng hướng cũ
square.classList.remove('tilt-left', 'tilt-right', 'square-bounce');
if (direction === 'left') {
  square.classList.add('tilt-right');
} else if (direction === 'right') {
  square.classList.add('tilt-left');
}

// 3. Square bounce
setTimeout(() => {
  square.classList.remove('tilt-left', 'tilt-right');
  square.classList.add('square-bounce');
}, 800); // Delay 100ms cho nghiêng nhẹ rồi mới nảy

// 4. Sau khi bounce xong → xử lý desc trượt
setTimeout(() => {
  const isLeft = descBox.classList.contains('visible-left');
  const isRight = descBox.classList.contains('visible-right');

  // Remove hiệu ứng focus
  descBox.classList.remove('focus-desc');

  // Add class trượt ngược
  if (isLeft) {
    descBox.classList.add('exit-left');
  } else if (isRight) {
    descBox.classList.add('exit-right');
  }

  // Hạ z-index chuẩn bị trượt
  descBox.style.zIndex = '1';

  // Reset hoàn toàn sau 400ms
  setTimeout(() => {
    descBox.classList.remove('visible-left', 'visible-right', 'exit-right', 'exit-left');
    descBox.style.left = '';
    descBox.style.top = '';
  }, 400);
}, 400); // ⏱ 300ms bounce + 100ms buffer

// 5. Gỡ blur
square.classList.remove('square-disabled');
section3.classList.remove('disabled');
document.getElementById('section1').classList.remove('disabled');
buttons.forEach(btn => btn.classList.remove('disabled'));

// 6. Clear current button
currentClickedButton = null;
  }
});


}
