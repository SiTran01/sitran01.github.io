export function animateSquareOnLoad() {
  const square = document.getElementById('square');
  if (!square) return;

  // Bước 1: Add class để có trạng thái ban đầu
  square.classList.add('square-enter');

  // Bước 2: Delay 2 frame để trình duyệt kịp apply trạng thái đó
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // Bước 3: Remove để kích hoạt transition
      square.classList.remove('square-enter');
    });
  });
}