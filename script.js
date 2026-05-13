const root = document.documentElement;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (!prefersReducedMotion.matches) {
  let currentScroll = window.scrollY;
  let targetScroll = window.scrollY;
  let ticking = false;

  const updateScene = () => {
    currentScroll += (targetScroll - currentScroll) * 0.08;

    if (Math.abs(targetScroll - currentScroll) < 0.1) {
      currentScroll = targetScroll;
    }

    const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(currentScroll / maxScroll, 1);

    root.style.setProperty("--scroll", currentScroll.toFixed(2));
    root.style.setProperty("--progress", progress.toFixed(4));

    if (Math.abs(targetScroll - currentScroll) > 0.1) {
      window.requestAnimationFrame(updateScene);
    } else {
      ticking = false;
    }
  };

  const onScroll = () => {
    targetScroll = window.scrollY;

    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateScene);
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
}
