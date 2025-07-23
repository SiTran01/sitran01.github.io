export function initEmailLink() {
  const emailLink = document.getElementById('email-link');
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (!emailLink) return;

  emailLink.href = isMobile
    ? "mailto:quocsi15@gmail.com"
    : "https://mail.google.com/mail/?view=cm&fs=1&to=quocsi15@gmail.com";
}
