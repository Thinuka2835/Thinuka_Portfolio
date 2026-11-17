// Markdown → safe HTML. One pipeline for the build (published pages) and the
// admin preview, so what you preview is exactly what gets published.
//
// Safety: raw HTML in Markdown is parsed and then passed through
// rehype-sanitize (GitHub's allow-list): <script>, event handlers, inline
// styles, iframes and javascript:/data: URLs are stripped. External links
// open in a new tab with rel="noopener noreferrer nofollow".
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeHighlight from 'rehype-highlight'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'
import { cldUrl, cldSrcSet, isCloudinaryUrl } from './cloudinary.js'

const schema = {
  ...defaultSchema,
  // Keep heading ids readable (rehype-slug adds them after sanitizing)
  clobberPrefix: 'md-',
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes.img || []), 'loading', 'decoding'],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
    src: ['https'],
  },
}

/** Lazy-load images; serve Cloudinary images responsively (f_auto,q_auto + srcset). */
function rehypeImages() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return
      const props = node.properties || (node.properties = {})
      props.loading = 'lazy'
      props.decoding = 'async'
      if (isCloudinaryUrl(props.src)) {
        const original = props.src
        props.src = cldUrl(original, { width: 1200 })
        props.srcSet = cldSrcSet(original, [480, 800, 1200, 1600])
        props.sizes = '(min-width: 860px) 760px, 100vw'
      }
    })
  }
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, schema)
  .use(rehypeSlug)
  .use(rehypeHighlight, { detect: false })
  .use(rehypeExternalLinks, {
    target: '_blank',
    rel: ['noopener', 'noreferrer', 'nofollow'],
    test: (el) => /^https?:\/\//i.test(String(el.properties?.href || '')),
  })
  .use(rehypeImages)
  .use(rehypeStringify)

export async function renderMarkdown(markdown) {
  const file = await processor.process(markdown)
  return String(file)
}
