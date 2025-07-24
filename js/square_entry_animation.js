// square_entry_animation.js

export function animateSquareOnLoad() {
  const square = document.getElementById('square');
  if (!square) return;

  // Thêm một frame để đảm bảo browser apply class ban đầu
  requestAnimationFrame(() => {
    square.classList.remove('square-enter');
  });
}

// Tự động gọi khi DOM đã load
window.addEventListener('DOMContentLoaded', () => {
  animateSquareOnLoad();
});
