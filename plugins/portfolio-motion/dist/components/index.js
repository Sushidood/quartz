// Motion: subtle page-enter, scroll-reveal, and image fade-in.
//
// Hand-written ESM (no build step), like plugins/portfolio-home. Renders
// nothing; it only ships a client script. Styles (and the
// prefers-reduced-motion guard) are in quartz/styles/portfolio.scss. The script
// also bails out under reduced motion, so nothing is ever hidden for those users.
// Classes are only added by the script, so content stays visible without JS.

const script = `
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
  const REVEAL = ".ph-body > h2, .wl-row, .project-hero, .project-page .markdown-rendered > h2"

  function onNav() {
    if (reduce.matches) return

    // Page enter: fade/rise the content column (sidebars stay put).
    const center = document.querySelector("#quartz-body > .center")
    if (center) {
      center.classList.remove("motion-enter")
      void center.offsetWidth
      center.classList.add("motion-enter")
      const end = () => center.classList.remove("motion-enter")
      center.addEventListener("animationend", end, { once: true })
      // Fallback: animations don't advance in hidden tabs; never leave content mid-fade.
      setTimeout(end, 600)
    }

    // Scroll reveal, only for things that start below the fold.
    if ("IntersectionObserver" in window) {
      const fold = window.innerHeight * 0.92
      const targets = [...document.querySelectorAll(REVEAL)].filter(
        (el) => el.getBoundingClientRect().top > fold,
      )
      if (targets.length > 0) {
        const io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (!e.isIntersecting) continue
              e.target.classList.add("is-revealed")
              io.unobserve(e.target)
            }
          },
          { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
        )
        for (const el of targets) {
          // Light stagger down a wikilinked list.
          if (el.classList.contains("wl-row")) {
            const i = [...el.parentElement.children].indexOf(el)
            el.style.transitionDelay = Math.min(i, 4) * 50 + "ms"
          }
          el.classList.add("reveal")
          io.observe(el)
        }
        window.addCleanup?.(() => io.disconnect())
      }
    }

    // Images that are still loading fade in instead of popping.
    for (const img of document.querySelectorAll("#quartz-body .center img")) {
      if (img.complete) continue
      img.classList.add("img-fade")
      const done = () => img.classList.add("is-loaded")
      img.addEventListener("load", done, { once: true })
      img.addEventListener("error", done, { once: true })
    }
  }

  document.addEventListener("nav", onNav)
})()
`

export function Motion() {
  const Component = () => null
  Component.afterDOMLoaded = script
  return Component
}
