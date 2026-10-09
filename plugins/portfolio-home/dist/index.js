// Portfolio homepage page type.
//
// Hand-written ESM (no build step): Quartz imports dist/ directly, so this file
// is the source. It renders the root `index` page as a portfolio homepage.
//
// Text content comes from the plugin options in quartz.config.yaml. Any of the
// same keys set in content/index.md frontmatter take precedence. Projects are
// read from the notes under `projectsFolder` and shown with ProjectCards.

import { h } from "preact"
import { ProjectCards, readProjects, splitFeatured } from "./components/index.js"

const defaultOptions = {
  name: "",
  role: "",
  focus: [],
  intro: [],
  education: [],
  projectsFolder: "projects",
}

const OVERRIDABLE = ["name", "role", "focus", "intro", "education"]

const asArray = (v) => (v == null || v === "" ? [] : Array.isArray(v) ? v : [v])

function Section({ id, title, children }) {
  return h(
    "section",
    { class: "ph-section", "aria-labelledby": id },
    h("h2", { class: "ph-heading", id }, title),
    children,
  )
}

export default function PortfolioHome(userOpts) {
  const opts = { ...defaultOptions, ...userOpts }

  const FeaturedCards = ProjectCards({ folder: opts.projectsFolder, show: "featured" })
  const OtherCards = ProjectCards({ folder: opts.projectsFolder, show: "other" })

  const HomeBody = () => {
    const Body = (props) => {
      const { fileData, allFiles } = props
      const fm = fileData.frontmatter ?? {}
      const data = { ...opts }
      for (const key of OVERRIDABLE) {
        if (fm[key] != null && fm[key] !== "") data[key] = fm[key]
      }

      const focus = asArray(data.focus)
      const intro = asArray(data.intro)
      const education = asArray(data.education)

      const { featured, other } = splitFeatured(readProjects(allFiles ?? [], opts.projectsFolder))

      return h(
        "article",
        { class: "portfolio-home" },
        h(
          "header",
          { class: "ph-hero" },
          h("h1", { class: "ph-name" }, data.name || fm.title || ""),
          data.role ? h("p", { class: "ph-role" }, data.role) : null,
          // Each item is its own span so lines only break between items.
          focus.length > 0
            ? h(
                "p",
                { class: "ph-focus" },
                focus.map((f, i) => [
                  i > 0 ? h("span", { class: "sep", "aria-hidden": "true" }, " · ") : null,
                  h("span", { class: "ph-focus-item" }, f),
                ]),
              )
            : null,
          intro.length > 0
            ? h(
                "div",
                { class: "ph-intro" },
                intro.map((p) => h("p", null, p)),
              )
            : null,
        ),
        featured.length > 0
          ? h(
              Section,
              { id: "featured-projects", title: "Featured projects" },
              h(FeaturedCards, props),
            )
          : null,
        education.length > 0
          ? h(
              Section,
              { id: "education", title: "Education" },
              education.map((e) =>
                h(
                  "div",
                  { class: "ph-edu" },
                  h(
                    "div",
                    null,
                    h("p", { class: "ph-edu-school" }, e.school ?? ""),
                    e.program ? h("p", { class: "ph-edu-program" }, e.program) : null,
                  ),
                  e.date ? h("span", { class: "ph-edu-date" }, e.date) : null,
                ),
              ),
            )
          : null,
        other.length > 0
          ? h(
              Section,
              { id: "other-projects", title: "Other projects" },
              h(OtherCards, props),
            )
          : null,
      )
    }
    return Body
  }

  return {
    name: "PortfolioHome",
    // Higher than content-page (0) so the root index uses this page type.
    priority: 10,
    match: ({ slug }) => slug === "index",
    layout: "home",
    body: HomeBody,
  }
}

PortfolioHome.quartzCategory = "pageType"
