// Project cards: reads project notes and renders them as a card grid.
//
// Hand-written ESM like ../index.js. Registered with Quartz's component
// registry (see "components" in package.json) and used by the homepage.
// Styles are in quartz/styles/portfolio.scss.
//
// Project frontmatter (all optional):
//   title, description, tags, featured: true, date, order (lower = first),
//   image: thumbnail as a URL, a vault path, a bare filename, or [[wikilink]].

import { h } from "preact"
import { joinSegments, pathToRoot, resolveRelative, slugifyFilePath } from "@quartz-community/utils"

const asArray = (v) => (v == null || v === "" ? [] : Array.isArray(v) ? v : [v])

// The description plugin derives text from the body, which usually starts with
// the note's own "# Title" heading; drop that repeated title.
function describe(fm, f) {
  if (fm.description) return String(fm.description)
  const text = f.description ?? ""
  const title = fm.title ?? ""
  return title && text.startsWith(title) ? text.slice(title.length).trim() : text
}

// Returns a vault-relative file path for the image, or a URL, or null.
export function resolveImage(raw, noteFilePath, contentFiles) {
  if (!raw) return null
  let ref = String(raw).trim()
  const wiki = ref.match(/^!?\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]$/)
  if (wiki) ref = wiki[1].trim()
  if (/^(https?:)?\/\//.test(ref) || ref.startsWith("data:")) return { url: ref }

  ref = ref.replace(/^\/+/, "")
  const files = contentFiles ?? []
  const noteDir = noteFilePath ? noteFilePath.split("/").slice(0, -1).join("/") : ""
  const candidates = [ref]
  if (noteDir) candidates.push(joinSegments(noteDir, ref).replace(/(^|\/)\.\//g, "$1"))
  for (const c of candidates) {
    if (files.includes(c)) return { path: c }
  }
  // Obsidian-style shortest path: match on file name alone.
  const name = ref.split("/").pop()
  const byName = files.find((f) => f === name || f.endsWith("/" + name))
  return byName ? { path: byName } : null
}

function parseDate(value) {
  if (value == null || value === "") return null
  const d = value instanceof Date ? value : new Date(String(value))
  return isNaN(d.getTime()) ? null : d
}

// Turns a resolveImage() result into a src usable from the page at currentSlug.
export function imageSrc(image, currentSlug) {
  if (image?.url) return image.url
  if (image?.path) return joinSegments(pathToRoot(currentSlug), slugifyFilePath(image.path))
  return null
}

export function formatDate(value, locale) {
  const d = parseDate(value)
  if (!d) return String(value)
  // A bare year ("2025") reads better unformatted.
  if (/^\d{4}$/.test(String(value).trim())) return String(value).trim()
  return d.toLocaleDateString(locale ?? "en-US", { year: "numeric", month: "short", timeZone: "UTC" })
}

export function readProjects(allFiles, folder, contentFiles) {
  const prefix = folder.replace(/\/+$/, "") + "/"
  return allFiles
    .filter((f) => f.slug && f.slug.startsWith(prefix) && !f.slug.endsWith("/index"))
    .map((f) => {
      const fm = f.frontmatter ?? {}
      const order = Number(fm.order)
      return {
        slug: f.slug,
        title: String(fm.title ?? f.slug.slice(prefix.length).replace(/-/g, " ")),
        description: describe(fm, f),
        tags: asArray(fm.tags).map(String),
        featured: fm.featured === true || fm.featured === "true",
        date: fm.date ?? null,
        order: Number.isFinite(order) ? order : null,
        image: resolveImage(fm.image ?? fm.thumbnail, f.relativePath, contentFiles),
      }
    })
    .sort((a, b) => {
      if (a.order !== b.order) {
        if (a.order === null) return 1
        if (b.order === null) return -1
        return a.order - b.order
      }
      const da = parseDate(a.date)?.getTime() ?? -Infinity
      const db = parseDate(b.date)?.getTime() ?? -Infinity
      if (da !== db) return db - da
      return a.title.localeCompare(b.title)
    })
}

// With nothing marked `featured: true`, every project counts as featured.
export function splitFeatured(projects) {
  const anyFeatured = projects.some((p) => p.featured)
  return {
    featured: anyFeatured ? projects.filter((p) => p.featured) : projects,
    other: anyFeatured ? projects.filter((p) => !p.featured) : [],
  }
}

export function ProjectCard({ project: p, currentSlug, locale }) {
  const imgSrc = imageSrc(p.image, currentSlug)

  return h(
    "li",
    { class: "project-card-item" },
    h(
      "a",
      { class: "project-card", href: resolveRelative(currentSlug, p.slug) },
      imgSrc
        ? h(
            "div",
            { class: "pc-media" },
            h("img", { src: imgSrc, alt: "", loading: "lazy", decoding: "async" }),
          )
        : null,
      h(
        "div",
        { class: "pc-body" },
        p.date ? h("p", { class: "pc-date" }, formatDate(p.date, locale)) : null,
        h("h3", { class: "pc-title" }, p.title),
        p.description ? h("p", { class: "pc-desc" }, p.description) : null,
        p.tags.length > 0
          ? h(
              "ul",
              { class: "pc-tags", "aria-label": "Tags" },
              // Quartz slugifies tags ("PCB" -> "pcb"); CSS shows them in uppercase.
              p.tags.map((t) => h("li", null, t.replace(/-/g, " "))),
            )
          : null,
      ),
    ),
  )
}

const defaultOptions = {
  folder: "projects",
  // "all" | "featured" | "other"
  show: "all",
}

export function ProjectCards(userOpts) {
  const opts = { ...defaultOptions, ...userOpts }

  const Component = ({ fileData, allFiles, ctx, cfg }) => {
    const projects = readProjects(allFiles ?? [], opts.folder, ctx?.allFiles)
    const groups = splitFeatured(projects)
    const list = opts.show === "featured" ? groups.featured : opts.show === "other" ? groups.other : projects
    if (list.length === 0) return null

    return h(
      "ul",
      { class: "project-cards" },
      list.map((p) => h(ProjectCard, { project: p, currentSlug: fileData.slug, locale: cfg?.locale })),
    )
  }
  return Component
}
