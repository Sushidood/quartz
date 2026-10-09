// Project page type: renders notes under `folder` (default "projects/") with a
// project header (title, tags, date, optional description and hero image)
// followed by the note's Markdown.
//
// Hand-written ESM (no build step), like plugins/portfolio-home. Shares the
// frontmatter helpers from that plugin. Styles are in quartz/styles/portfolio.scss.
//
// Frontmatter (all optional): tags, date, description, hero (falls back to image).

import { h } from "preact"
import { htmlToJsx, resolveRelative } from "@quartz-community/utils"
import { formatDate, imageSrc, resolveImage } from "../../portfolio-home/dist/components/index.js"

const defaultOptions = {
  folder: "projects",
}

// Heading ids are slugs, but escape anything that could break out of the selector.
const CSS_ESCAPE = (id) => id.replace(/["\\<>]/g, "")

const asArray = (v) => (v == null || v === "" ? [] : Array.isArray(v) ? v : [v])

const textOf = (node) =>
  node.type === "text" ? node.value : (node.children ?? []).map(textOf).join("")

// Notes often repeat their title as a leading "# Title"; the header already shows it.
// Returns the tree without it, plus the dropped heading's id (for the TOC).
function withoutLeadingTitle(tree, title) {
  if (!tree?.children) return { tree, droppedId: null }
  const idx = tree.children.findIndex((n) => n.type === "element")
  const first = tree.children[idx]
  if (
    first &&
    first.tagName === "h1" &&
    textOf(first).trim().toLowerCase() === String(title).trim().toLowerCase()
  ) {
    return {
      tree: { ...tree, children: tree.children.filter((_, i) => i !== idx) },
      droppedId: first.properties?.id ? String(first.properties.id) : null,
    }
  }
  return { tree, droppedId: null }
}

export default function PortfolioProject(userOpts) {
  const opts = { ...defaultOptions, ...userOpts }
  const prefix = opts.folder.replace(/\/+$/, "") + "/"

  const ProjectBody = () => {
    const Body = ({ fileData, tree, ctx, cfg }) => {
      const fm = fileData.frontmatter ?? {}
      const title = fm.title ?? ""
      const tags = asArray(fm.tags).map(String)
      const hero = imageSrc(
        resolveImage(fm.hero ?? fm.image, fileData.relativePath, ctx?.allFiles),
        fileData.slug,
      )
      const classes = ["popover-hint", "project-page", ...asArray(fm.cssclasses)].join(" ")
      const content = withoutLeadingTitle(tree, title)

      return h(
        "article",
        { class: classes },
        h(
          "header",
          { class: "project-header" },
          h("h1", { class: "project-title" }, title),
          tags.length > 0 || fm.date
            ? h(
                "p",
                { class: "project-meta" },
                tags.length > 0
                  ? h(
                      "span",
                      { class: "project-tags" },
                      tags.map((t, i) => [
                        i > 0 ? h("span", { class: "sep", "aria-hidden": "true" }, " · ") : null,
                        h(
                          "a",
                          { href: resolveRelative(fileData.slug, `tags/${t}`), class: "project-tag" },
                          // Quartz slugifies tags ("PCB" -> "pcb"); CSS shows them in uppercase.
                          t.replace(/-/g, " "),
                        ),
                      ]),
                    )
                  : null,
                fm.date ? h("span", { class: "project-date" }, formatDate(fm.date, cfg?.locale)) : null,
              )
            : null,
          fm.description ? h("p", { class: "project-lede" }, String(fm.description)) : null,
          hero
            ? h(
                "figure",
                { class: "project-hero" },
                h("img", { src: hero, alt: "", decoding: "async" }),
              )
            : null,
        ),
        h(
          "div",
          { class: "markdown-preview-view markdown-rendered" },
          htmlToJsx(content.tree),
        ),
        // The table of contents still lists the dropped heading; hide that entry.
        content.droppedId
          ? h("style", {
              dangerouslySetInnerHTML: {
                __html: `.toc li:has(> a[data-for="${CSS_ESCAPE(content.droppedId)}"]) { display: none; }`,
              },
            })
          : null,
      )
    }
    return Body
  }

  return {
    name: "PortfolioProject",
    // Above content-page (0); folder index pages are virtual and unaffected.
    priority: 5,
    match: ({ slug }) => slug.startsWith(prefix) && !slug.endsWith("/index"),
    layout: "project",
    body: ProjectBody,
  }
}

PortfolioProject.quartzCategory = "pageType"
