// 1) IntersectionObserver entrances
const items = document.querySelectorAll(".reveal");
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) e.target.classList.add("in");
    else e.target.classList.remove("in");
  });
}, { threshold: 0.15 });

items.forEach(el => io.observe(el));

// 2) Scroll progress -> CSS variable for parallax section(s)
const progressSections = document.querySelectorAll("[data-scroll-progress]");

function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

function updateProgress(){
  progressSections.forEach(section => {
    const r = section.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    // 0 when top hits top; 1 when bottom hits top (feel free to tweak)
    const raw = (-r.top) / (r.height);
    const p = clamp(raw, 0, 1);
    section.style.setProperty("--p", p.toFixed(4));
  });
}

window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);
updateProgress();

console.log("✅ main.js is running");
console.log("gsap:", window.gsap);
console.log("ScrollTrigger:", window.ScrollTrigger);

