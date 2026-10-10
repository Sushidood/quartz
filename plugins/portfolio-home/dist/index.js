// Portfolio homepage page type.
//
// Hand-written ESM (no build step): Quartz imports dist/ directly, so this file
// is the source. It renders the root `index` page (content/index.md). All text
// comes from that note:
//
//   title          -> the large name heading, and the site title in the sidebar
//   role, focus    -> optional frontmatter: a subtitle line and a "·" list
//   links          -> optional frontmatter list: a row of links (any page; see
//                     pageLinksNode in ./components/index.js)
//   body           -> rendered as Markdown below ("##" headings are styled as
//                     section labels; see quartz/styles/portfolio.scss)
//
// It also registers, for every page, the `<div class="wikilinked-list">` and
// `links` transforms (see ./components/index.js).
//
// A leading "# Title" in the body that repeats the title is not shown twice.

import { h } from "preact"
import { htmlToJsx } from "@quartz-community/utils"
import {
  pageLinksNode,
  pageLinksTransform,
  wikilinkedListTransform,
  withoutLeadingTitle,
} from "./components/index.js"

const asArray = (v) => (v == null || v === "" ? [] : Array.isArray(v) ? v : [v])

export default function PortfolioHome() {
  const HomeBody = () => {
    const Body = ({ fileData, tree, allFiles }) => {
      const fm = fileData.frontmatter ?? {}
      const title = fm.title ?? ""
      const focus = asArray(fm.focus).map(String)
      const body = withoutLeadingTitle(tree, title).tree
      const classes = ["popover-hint", "portfolio-home", ...asArray(fm.cssclasses)].join(" ")

      return h(
        "article",
        { class: classes },
        h(
          "header",
          { class: "ph-hero" },
          h("h1", { class: "ph-name" }, title),
          fm.role ? h("p", { class: "ph-role" }, String(fm.role)) : null,
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
          (() => {
            const links = pageLinksNode(fileData, allFiles)
            return links ? htmlToJsx({ type: "root", children: [links] }) : null
          })(),
        ),
        h("div", { class: "ph-body markdown-preview-view markdown-rendered" }, htmlToJsx(body)),
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
    // Runs before any page is emitted: use index.md's title as the site title
    // (sidebar name). `pageTitle` in quartz.config.yaml is only the fallback.
    generate: ({ content, cfg }) => {
      const index = content.find(([, file]) => file.data.slug === "index")
      const title = index?.[1].data.frontmatter?.title
      if (title) cfg.pageTitle = String(title)
      return []
    },
    treeTransforms: () => [wikilinkedListTransform, pageLinksTransform],
  }
}

PortfolioHome.quartzCategory = "pageType"
