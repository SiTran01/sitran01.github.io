import { updateDescription } from './description_box.js';
import { applySVGGradient } from './svg_gradient.js';

export function handleHoverEffects() {
  const buttons = document.querySelectorAll('#section2 .button');
  const descBox = document.getElementById('service-description');
  const square = document.getElementById('square');
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  let currentHoveredButton = null;
  let descTimeout = null;

  buttons.forEach(button => {
    let iconTimeout;

    button.addEventListener('mouseenter', () => {
      if (isMobile) return;

      currentHoveredButton = button;
      square.classList.add('square-active');

      const svg = button.querySelector('.notion-icon');
      if (svg) {
        iconTimeout = setTimeout(() => {
          applySVGGradient(svg, 'url(#icon-gradient-hover)');
        }, 450);
      }

      const squareRect = square.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const squareCenterX = squareRect.left + squareRect.width / 2;
      const buttonCenterX = buttonRect.left + buttonRect.width / 2;
      const direction = buttonCenterX < squareCenterX ? 'right' : 'left';

      descBox.classList.remove('visible-left', 'visible-right');
      if (descTimeout) clearTimeout(descTimeout);

      descTimeout = setTimeout(() => {
        if (currentHoveredButton !== button) return;

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
      }, 400);

      button.classList.remove('button-reverse');
    });

    button.addEventListener('mouseleave', () => {
      currentHoveredButton = null;
      square.classList.remove('square-active');

      clearTimeout(iconTimeout);
      applySVGGradient(button.querySelector('.notion-icon'), 'url(#icon-gradient)');

      descBox.classList.remove('visible-left', 'visible-right');

      const borders = button.querySelectorAll(
        '.border-blue, .border-blue-bottom, .border-pink, .border-pink-top'
      );
      borders.forEach(el => {
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
      });

      button.classList.add('button-reverse');
      setTimeout(() => {
        button.classList.remove('button-reverse');
      }, 300);
    });
  });
}
