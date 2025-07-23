export function applySVGGradient(svg, targetGradient) {
  if (!svg) return;
  svg.querySelectorAll('path').forEach(path => {
    if (path.getAttribute('fill')?.startsWith('url')) {
      path.setAttribute('fill', targetGradient);
    }
  });
}
