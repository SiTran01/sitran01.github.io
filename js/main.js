
  const emailLink = document.getElementById('email-link');
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    emailLink.href = "mailto:quocsi15@gmail.com";
  } else {
    emailLink.href = "https://mail.google.com/mail/?view=cm&fs=1&to=quocsi15@gmail.com";
  }
