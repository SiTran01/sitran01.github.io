import { updateDescription } from './description_box.js';
import { applySVGGradient } from './svg_gradient.js';

export function handleClickEffects() {
  const buttons = document.querySelectorAll('#section2 .button');
  const descBox = document.getElementById('service-description');
  const square = document.getElementById('square');
  const section3 = document.getElementById('section3');
  const section1 = document.getElementById('section1');


  let currentClickedButton = null;
  let descTimeout = null;
  let direction = null;

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      // Nếu click vào đúng button đang active thì bỏ qua
      if (currentClickedButton === button) return;

      // Reset nút cũ
      if (currentClickedButton) {
        currentClickedButton.classList.remove('active');
        currentClickedButton.classList.add('button-reverse');
        setTimeout(() => {
          currentClickedButton.classList.remove('button-reverse');
        }, 600);
      }
      buttons.forEach(btn => btn.classList.remove('disabled'));
      section3.classList.remove('disabled');

      // Kích hoạt nút mới
      button.classList.add('active');
      const icon = button.querySelector('.icon-gradient');
      if (icon) icon.style.animation = 'gradientText 2.5s forwards';

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
      descBox.classList.remove('visible-left', 'visible-right', 'desc-overlap', 'focus-desc');

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
            descBox.style.left = `${squareRect.left + window.scrollX}px`;
            descBox.classList.add('visible-right');
          } else {
            descBox.style.left = `${squareRect.left + window.scrollX}px`;
            descBox.classList.add('desc-overlap');
          }
        } else {
          if (spaceLeft >= descWidth) {
            descBox.style.left = `${squareRect.right + window.scrollX - descWidth}px`;
            descBox.classList.add('visible-left');
          } else {
            descBox.style.left = `${squareRect.left + window.scrollX}px`;
            descBox.classList.add('desc-overlap');
          }
        }

        descBox.style.zIndex = '2';

        setTimeout(() => {
          descBox.classList.add('focus-desc');
        }, 30);

        setTimeout(() => {
          square.classList.remove('tilt-left', 'tilt-right');
        }, 450);
      }, 400);
    });
  });

  // Reset toàn bộ khi click ra ngoài
  document.addEventListener('click', (e) => {
  const isInButton = e.target.closest('#section2 .button');
  const isInDesc = e.target.closest('#service-description');

  console.log('CLICK: ', e.target);
  console.log('isInButton:', isInButton);
  console.log('isInDesc:', isInDesc);

  if (isInButton || isInDesc) {
    console.log('👉 Clicked inside — IGNORE');
    return;
  }

    if (!currentClickedButton) return;

    console.log('👉 Clicked outside — resetting UI');

    currentClickedButton.classList.remove('active');
    const icon = currentClickedButton.querySelector('.icon-gradient');
    if (icon) icon.style.animation = '';
    applySVGGradient(currentClickedButton.querySelector('.notion-icon'), 'url(#icon-gradient)');
    currentClickedButton.classList.add('button-reverse');
    setTimeout(() => {
      currentClickedButton.classList.remove('button-reverse');
    }, 600);

    const isLeft = descBox.classList.contains('visible-left');
    const isRight = descBox.classList.contains('visible-right');
    const isOverlap = descBox.classList.contains('desc-overlap');
    descBox.classList.remove('focus-desc');

  
if (isOverlap) {
  descBox.classList.add('exit-fade');
  setTimeout(() => {
    descBox.classList.remove('exit-fade', 'desc-overlap');
    descBox.style.left = '';
    descBox.style.top = '';
    descBox.style.zIndex = '0';
  }, 400);
} else {
  // 👉 Add hiệu ứng NGAY LẬP TỨC
  setTimeout(() => {
  if (isLeft) descBox.classList.add('exit-left');
  else if (isRight) descBox.classList.add('exit-right');
}, 400);

  // ⏱ Sau 400ms mới clean
  setTimeout(() => {
    descBox.classList.remove(
      'visible-left',
      'visible-right',
      'desc-overlap',
      'exit-left',
      'exit-right'
    );
    descBox.style.left = '';
    descBox.style.top = '';
    descBox.style.zIndex = '0';
  }, 800);
}
    square.classList.remove('tilt-left', 'tilt-right', 'square-bounce');
    if (direction === 'left') square.classList.add('tilt-right');
    else if (direction === 'right') square.classList.add('tilt-left');

    setTimeout(() => {
      square.classList.remove('tilt-left', 'tilt-right');
      square.classList.add('square-bounce');
    }, 800);

    square.classList.remove('square-disabled');
    section3.classList.remove('disabled');
    section1.classList.remove('disabled');
    buttons.forEach(btn => btn.classList.remove('disabled'));

    currentClickedButton = null;
  });
}