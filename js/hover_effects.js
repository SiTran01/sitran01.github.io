export function handleHoverEffects() {
  const buttons = document.querySelectorAll('#section2 .button');

  buttons.forEach(button => {
    // Khi hover vào
    button.addEventListener('mouseenter', () => {
      // Huỷ class reverse nếu có (tránh xung đột khi hover lại nhanh)
      button.classList.remove('button-reverse');

      // Mặc định, .button:hover trong CSS đã trigger animation vào
      // nên không cần thêm gì trong JS tại đây
    });

    // Khi rời chuột ra
    button.addEventListener('mouseleave', () => {
      // Thêm class reverse để trigger animation ngược
      button.classList.add('button-reverse');

      // Sau khi hiệu ứng ngược xong thì xoá class để chuẩn bị lần sau
      setTimeout(() => {
        button.classList.remove('button-reverse');
      }, 600); // = thời gian animation dài nhất: 0.5s + buffer
    });
  });
}
