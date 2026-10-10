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

const textOf = (node) =>
  node.type === "text" ? node.value : (node.children ?? []).map(textOf).join("")

// Notes often repeat their title as a leading "# Title"; the header already shows it.
// Returns the tree without it, plus the dropped heading's id (for the TOC).
export function withoutLeadingTitle(tree, title) {
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

// Wikilinked lists written in Markdown. Wrap a bulleted list of wikilinks in
//
//   <div class="wikilinked-list">
//
//   - [[Hall Effect Macropad]]
//   - [[Food Portioning]]
//
//   </div>
//
// (blank lines around the list keep it Markdown) and each linked note becomes
// a row: title, date, description, and tags, all from that note's frontmatter.
// Empty items are dropped; other items that aren't a single resolvable
// wikilink are left as they are.
// Registered as a tree transform, so it works in any note.

const el = (tagName, className, children, extra = {}) => ({
  type: "element",
  tagName,
  properties: { className: className ? [className] : [], ...extra },
  children,
})
const txt = (value) => ({ type: "text", value })
const classesOf = (node) => asArray(node.properties?.className).map(String)

// Native Quartz tag link (same markup as Obsidian-style #tags in note bodies),
// so every tag on the site shares one look and links to Quartz's tag pages.
export function tagLinkNode(tag, currentSlug) {
  return el("a", "tag-link", [txt(tag)], {
    className: ["tag-link", "internal", "internal-link"],
    href: resolveRelative(currentSlug, `tags/${tag}`),
  })
}

function wikilinkedRow(li, filesBySlug, locale, currentSlug) {
  const kids = (li.children ?? []).filter((n) => !(n.type === "text" && !n.value.trim()))
  // A list item is either the link itself or a <p> holding just the link.
  const holder = kids.length === 1 && kids[0].tagName === "p" ? kids[0] : li
  const inner = (holder.children ?? []).filter((n) => !(n.type === "text" && !n.value.trim()))
  const a = inner.length === 1 && inner[0].tagName === "a" ? inner[0] : null
  // Quartz's link transform stores the attribute as "data-slug", not dataSlug.
  const slug = a?.properties?.["data-slug"] ?? a?.properties?.dataSlug
  const file = slug ? filesBySlug.get(String(slug)) : null
  if (!file) return null

  const fm = file.frontmatter ?? {}
  const title = String(fm.title ?? textOf(a))
  const desc = describe(fm, file)
  // Frontmatter tags and inline #tags (Quartz merges both into frontmatter.tags).
  const tags = asArray(fm.tags).map(String)

  // The title link is "stretched" over the whole row (CSS ::after), so the row
  // is clickable while the tag links on top of it still go to their tag pages.
  const top = [el("a", "wl-link", [el("span", "wl-title", [txt(title)])], { href: a.properties.href })]
  if (fm.date) top.push(el("span", "wl-date", [txt(formatDate(fm.date, locale))]))

  const body = [el("span", "wl-top", top)]
  if (desc) body.push(el("span", "wl-desc", [txt(desc)]))
  if (tags.length > 0) body.push(el("span", "wl-tags", tags.map((t) => tagLinkNode(t, currentSlug))))

  return el("li", "wl-row", body)
}

export function wikilinkedListTransform(root, slug, componentData) {
  const filesBySlug = new Map((componentData.allFiles ?? []).map((f) => [String(f.slug), f]))
  const locale = componentData.cfg?.locale

  const visit = (node) => {
    if (node.type === "element" && node.tagName === "div" && classesOf(node).includes("wikilinked-list")) {
      for (const list of node.children ?? []) {
        if (list.type !== "element" || (list.tagName !== "ul" && list.tagName !== "ol")) continue
        list.properties = { ...list.properties, className: [...classesOf(list), "wl-rows"] }
        list.children = (list.children ?? [])
          .filter((li) => !(li.type === "element" && li.tagName === "li" && !textOf(li).trim()))
          .map((li) =>
            li.type === "element" && li.tagName === "li" ? wikilinkedRow(li, filesBySlug, locale, slug) ?? li : li,
          )
      }
      return
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(root)
}

// Page links: a `links` frontmatter list rendered as a row of links at the top
// of the page (in the hero on the homepage). Each item can be
//   "[Label](https://...)"   a Markdown link
//   "[[Note]]" / "[[Note|Label]]"   a wikilink to a note
//   "https://..."            a bare URL (label = host name)
//   "name@example.com"       an email address (label = "Email")
// Unresolvable wikilinks are shown as plain text.

const MD_LINK = /^\[([^\]]+)\]\((\S+?)\)$/
const WIKI_LINK = /^!?\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function findNote(target, allFiles) {
  const slug = slugifyFilePath(target.trim().replace(/\.md$/i, "") + ".md")
  return (
    allFiles.find((f) => f.slug === slug) ??
    allFiles.find((f) => String(f.slug).endsWith("/" + slug))
  )
}

function parsePageLink(raw, currentSlug, allFiles) {
  // Unquoted `- [[Note]]` in YAML parses as a nested list: [["Note"]].
  if (Array.isArray(raw)) raw = `[[${raw.flat(Infinity).join("")}]]`
  const text = String(raw ?? "").trim()
  if (!text) return null
  let m
  if ((m = text.match(WIKI_LINK))) {
    const file = findNote(m[1], allFiles)
    const label = (m[2] ?? file?.frontmatter?.title ?? m[1]).trim()
    return file ? { label, href: resolveRelative(currentSlug, file.slug), external: false } : { label }
  }
  if ((m = text.match(MD_LINK))) {
    // A bare address in the link target becomes mailto:, an existing scheme is kept.
    const href = !/^[a-z][a-z0-9+.-]*:/i.test(m[2]) && EMAIL.test(m[2]) ? "mailto:" + m[2] : m[2]
    return { label: m[1].trim(), href, external: /^(https?:|mailto:)/.test(href) }
  }
  if (EMAIL.test(text)) return { label: "Email", href: "mailto:" + text, external: true }
  if (/^https?:\/\//.test(text)) {
    let label = text
    try {
      label = new URL(text).hostname.replace(/^www\./, "")
    } catch {}
    return { label, href: text, external: true }
  }
  return { label: text }
}

export function pageLinksNode(fileData, allFiles) {
  const items = asArray(fileData?.frontmatter?.links)
    .map((raw) => parsePageLink(raw, fileData.slug, allFiles ?? []))
    .filter(Boolean)
  if (items.length === 0) return null

  return el(
    "nav",
    "page-links",
    items.map((l) => {
      if (!l.href) return el("span", "page-link", [txt(l.label)])
      const extra = { href: l.href }
      if (l.external && !l.href.startsWith("mailto:")) {
        extra.target = "_blank"
        extra.rel = "noreferrer"
      }
      const kids = [txt(l.label)]
      if (l.external) kids.push(el("span", "page-link-ext", [txt("↗")], { ariaHidden: "true" }))
      return el("a", "page-link", kids, extra)
    }),
    { ariaLabel: "Links" },
  )
}

// Tree transform: put the links row at the top of every page's body. The
// homepage renders it inside its hero instead (see ../index.js).
export function pageLinksTransform(root, slug, componentData) {
  if (slug === "index") return
  const node = pageLinksNode(componentData.fileData, componentData.allFiles)
  if (node) root.children = [node, ...(root.children ?? [])]
}
