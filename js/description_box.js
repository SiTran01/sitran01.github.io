export function updateDescription(button, descBox) {
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
