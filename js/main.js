import { initEmailLink } from './email_link.js';
import { handleClickEffects } from './click_effects.js';
import { handleHoverEffects } from './hover_effects.js';
import { animateSquareOnLoad } from './square_entry_animation.js'; // thêm dòng này

initEmailLink();
handleClickEffects();
handleHoverEffects();
window.addEventListener('DOMContentLoaded', () => {
  animateSquareOnLoad();
});