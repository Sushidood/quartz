// Tag pages: the page you land on after clicking a tag. Replaces
// @quartz-community/tag-page (disabled in quartz.config.yaml) so tagged notes
// show as wikilinked-list rows (title, date, description, tags), the same as
// `<div class="wikilinked-list">` lists.
//
// Hand-written ESM (no build step), like plugins/portfolio-home. Shares the row
// markup from that plugin. Styles are in quartz/styles/portfolio.scss.
//
//   tags/<tag>   every note tagged <tag> (or a nested tag under it, e.g. a/b)
//   tags/index   every tag, each followed by its notes
//
// A note at tags/<tag>.md is shown above the list, as with Quartz's tag pages.

import { h } from "preact"
import {
  getAllSegmentPrefixes,
  htmlToJsx,
  joinSegments,
  resolveRelative,
  simplifySlug,
} from "@quartz-community/utils"
import { noteRowNode } from "../../portfolio-home/dist/components/index.js"

const asArray = (v) => (v == null || v === "" ? [] : Array.isArray(v) ? v : [v])

const isListed = (f) => f.unlisted !== true
const tagsOf = (f) => asArray(f.frontmatter?.tags).map(String).flatMap(getAllSegmentPrefixes)
const isTagSlug = (slug) => slug === "tags" || slug.startsWith("tags/")

function parseDate(value) {
  if (value == null || value === "") return null
  const d = value instanceof Date ? value : new Date(String(value))
  return isNaN(d.getTime()) ? null : d
}

const orderOf = (fm) => {
  const n = Number(fm.order)
  return Number.isFinite(n) ? n : null
}

// Same order as the project cards: `order`, then newest `date`, then title.
function compareNotes(a, b) {
  const fa = a.frontmatter ?? {}
  const fb = b.frontmatter ?? {}
  const oa = orderOf(fa)
  const ob = orderOf(fb)
  if (oa !== ob) {
    if (oa === null) return 1
    if (ob === null) return -1
    return oa - ob
  }
  const da = parseDate(fa.date)?.getTime() ?? -Infinity
  const db = parseDate(fb.date)?.getTime() ?? -Infinity
  if (da !== db) return db - da
  return String(fa.title ?? a.slug).localeCompare(String(fb.title ?? b.slug))
}

const countLabel = (n) => `${n} ${n === 1 ? "item" : "items"}`

function rowsList(files, currentSlug, locale) {
  const rows = files.map((f) => noteRowNode(f, resolveRelative(currentSlug, f.slug), currentSlug, locale))
  return h(
    "div",
    { class: "wikilinked-list" },
    htmlToJsx({ type: "root", children: [{ type: "element", tagName: "ul", properties: { className: ["wl-rows"] }, children: rows }] }),
  )
}

export default function PortfolioTags() {
  const TagBody = () => {
    const Body = ({ fileData, tree, allFiles, cfg }) => {
      const slug = fileData.slug
      const locale = cfg?.locale
      const notes = (allFiles ?? []).filter((f) => isListed(f) && !isTagSlug(String(f.slug)))
      const withTag = (t) => notes.filter((f) => tagsOf(f).includes(t)).sort(compareNotes)
      const fm = fileData.frontmatter ?? {}
      const classes = ["popover-hint", "tag-page", ...asArray(fm.cssclasses)].join(" ")
      const intro =
        tree?.children?.length > 0
          ? h("div", { class: "markdown-preview-view markdown-rendered" }, htmlToJsx(tree))
          : null

      const tag = simplifySlug(slug.slice("tags/".length))
      if (tag === "/") {
        const tags = [...new Set(notes.flatMap(tagsOf))].sort((a, b) => a.localeCompare(b))
        return h(
          "article",
          { class: classes },
          intro,
          tags.map((t) => {
            const files = withTag(t)
            return h(
              "section",
              { class: "tag-section" },
              h(
                "h2",
                { class: "tag-label" },
                h("a", { class: "tag-label-link internal", href: resolveRelative(slug, joinSegments("tags", t)) }, "#" + t),
                h("span", { class: "tag-count" }, countLabel(files.length)),
              ),
              rowsList(files, slug, locale),
            )
          }),
        )
      }

      const files = withTag(tag)
      return h(
        "article",
        { class: classes },
        intro,
        h("section", { class: "tag-section" }, h("h2", { class: "tag-label" }, h("span", { class: "tag-count" }, countLabel(files.length))), rowsList(files, slug, locale)),
      )
    }
    return Body
  }

  return {
    name: "PortfolioTags",
    // Above content-page (0): a real note at tags/<tag>.md renders as a tag page.
    priority: 10,
    match: ({ slug }) => isTagSlug(slug),
    layout: "tag",
    body: TagBody,
    // One page per tag (plus tags/index), unless a note already exists there.
    generate: ({ content }) => {
      const files = content.map(([, f]) => f.data).filter(isListed)
      const existing = new Set(files.map((f) => String(f.slug)).filter(isTagSlug))
      const tags = new Set(files.flatMap(tagsOf))
      tags.add("index")
      const pages = []
      for (const t of tags) {
        const slug = joinSegments("tags", t)
        if (existing.has(slug)) continue
        pages.push({ slug, title: t === "index" ? "Tags" : t, data: {} })
      }
      return pages
    },
  }
}

PortfolioTags.quartzCategory = "pageType"
