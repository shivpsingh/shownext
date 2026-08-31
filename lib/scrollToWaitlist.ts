export function scrollToWaitlist(): void {
  const target = document.getElementById("waitlist");
  if (!(target instanceof HTMLElement)) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  window.history.pushState(null, "", "#waitlist");
}
