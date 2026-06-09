<script>
  import { onMount, tick } from 'svelte'
  import guideMarkdownEn from '../data/pnw-diving-field-guide.md?raw'
  import guideMarkdownEs from '../data/pnw-diving-field-guide.es.md?raw'
  import guideMarkdownId from '../data/pnw-diving-field-guide.id.md?raw'

  export let t
  export let currentLanguage = 'en'

  const imageBase = '/images/scuba/'
  const slugCounts = new Map()
  const guideMarkdownByLanguage = {
    en: guideMarkdownEn,
    es: guideMarkdownEs,
    id: guideMarkdownId,
  }
  const stableHeadingIds = [
    'preface',
    'part-1-why-the-salish-sea',
    'part-2-getting-started-three-ways-in',
    'part-3-demystifying-the-gear-configurations-and-which-are-actually-yours-to-make',
    'part-4-where-to-plug-in-shops-clubs-and-community',
    'part-5-reading-the-water-tides-slack-and-conditions',
    'part-6-the-cast-critters-of-puget-sound',
    'part-7-where-to-dive-a-difficulty-progression',
    'part-8-the-certification-ladder-where-to-go-next',
  ]

  const escapeHtml = (value = '') =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const slugify = (value = '') => {
    const base = value
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'section'
    const count = slugCounts.get(base) || 0
    slugCounts.set(base, count + 1)
    return count ? `${base}-${count + 1}` : base
  }

  const formatInline = (value = '') => {
    let formatted = escapeHtml(value)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
      .replace(/\[\^([^\]]+)\]/g, '<sup><a href="#note-$1">$1</a></sup>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')

    return formatted.replace(/`([^`]+)`/g, '<code>$1</code>')
  }

  const transformImagePath = (value = '') =>
    value
      .replace(/src="img\/([^"]+?)\.(?:jpg|jpeg|png)"/gi, (_match, path) => `src="${imageBase}${path}.webp"`)
      .replace(/class="gallery"/g, 'class="scuba-guide-gallery"')
      .replace(/class="wrap-right"/g, 'class="scuba-guide-figure scuba-guide-figure-right"')
      .replace(/class="wrap-left"/g, 'class="scuba-guide-figure scuba-guide-figure-left"')

  const renderTable = (rows) => {
    const cleanRows = rows.filter((row) => !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(row))
    const cells = cleanRows.map((row) =>
      row
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((cell) => cell.trim())
    )
    const [head = [], ...body] = cells
    return `
      <div class="scuba-table-wrap">
        <table>
          <thead><tr>${head.map((cell) => `<th>${formatInline(cell)}</th>`).join('')}</tr></thead>
          <tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${formatInline(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
    `
  }

  const renderList = (rows, ordered = false) => {
    const items = rows.map((row) => {
      const text = ordered ? row.replace(/^\d+\.\s+/, '') : row.replace(/^-\s+/, '')
      return `<li>${formatInline(text)}</li>`
    })
    return `<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`
  }

  const getPartLabel = (item) => {
    const textMatch = item.text.match(/^(Part|Bagian|Parte)\s+(\d+)/i)
    if (textMatch) return `${textMatch[1]} ${textMatch[2]}`

    const idMatch = item.id.match(/^part-(\d+)/)
    return idMatch ? `Part ${idMatch[1]}` : item.text
  }

  const isGuideNote = (value = '') =>
    /^\*(One note before we begin|Satu catatan sebelum kita mulai|Una nota antes de comenzar):/i.test(value)

  const isSummaryHeading = (value = '') => /^(Summary|Ringkasan|Resumen)$/i.test(value)

  const parseGuide = (markdown) => {
    slugCounts.clear()

    const lines = markdown.replace(/\r\n/g, '\n').split('\n')
    const footnotes = []
    const body = []
    const toc = []
    let title = ''
    let subtitle = ''
    let byline = ''
    let h2Index = 0
    let nextParagraphIsSummary = false

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      const trimmed = line.trim()

      if (!trimmed || trimmed === '---') continue

      if (trimmed.startsWith('[^')) {
        const match = trimmed.match(/^\[\^([^\]]+)\]:\s*(.+)$/)
        if (match) {
          footnotes.push({ id: match[1], text: formatInline(match[2]) })
        }
        continue
      }

      if (trimmed.startsWith('# ')) {
        title = trimmed.replace(/^#\s+/, '')
        continue
      }

      if (!subtitle && trimmed.startsWith('*') && trimmed.endsWith('*')) {
        subtitle = trimmed.replace(/^\*|\*$/g, '')
        continue
      }

      if (!byline && /^\*\*(By|Oleh|Por)\s+Abraham(?:\s+Godong)?\*\*/.test(trimmed)) {
        byline = trimmed.replace(/\*\*/g, '')
        continue
      }

      if (trimmed.startsWith('<figure') || trimmed.startsWith('<div class="gallery"')) {
        const closingTag = trimmed.startsWith('<figure') ? '</figure>' : '</div>'
        const html = [line]
        while (index < lines.length - 1 && !lines[index].includes(closingTag)) {
          index += 1
          html.push(lines[index])
        }
        body.push(transformImagePath(html.join('\n')))
        continue
      }

      if (trimmed.startsWith('## ')) {
        const text = trimmed.replace(/^##\s+/, '')
        const id = stableHeadingIds[h2Index] || slugify(text)
        h2Index += 1
        toc.push({ id, text })
        body.push(`<h2 id="${id}">${formatInline(text)}</h2>`)
        continue
      }

      if (trimmed.startsWith('### ')) {
        const text = trimmed.replace(/^###\s+/, '')
        const id = slugify(text)
        const summaryHeading = isSummaryHeading(text)
        nextParagraphIsSummary = summaryHeading
        body.push(`<h3 id="${id}"${summaryHeading ? ' class="scuba-guide-summary-label"' : ''}>${formatInline(text)}</h3>`)
        continue
      }

      if (trimmed.startsWith('#### ')) {
        const text = trimmed.replace(/^####\s+/, '')
        const id = slugify(text)
        body.push(`<h4 id="${id}">${formatInline(text)}</h4>`)
        continue
      }

      if (/^\|.+\|$/.test(trimmed)) {
        const rows = [trimmed]
        while (index < lines.length - 1 && /^\|.+\|$/.test(lines[index + 1].trim())) {
          index += 1
          rows.push(lines[index].trim())
        }
        body.push(renderTable(rows))
        continue
      }

      if (/^\d+\.\s+/.test(trimmed)) {
        const rows = [trimmed]
        while (index < lines.length - 1 && /^\d+\.\s+/.test(lines[index + 1].trim())) {
          index += 1
          rows.push(lines[index].trim())
        }
        body.push(renderList(rows, true))
        continue
      }

      if (/^-\s+/.test(trimmed)) {
        const rows = [trimmed]
        while (index < lines.length - 1 && /^-\s+/.test(lines[index + 1].trim())) {
          index += 1
          rows.push(lines[index].trim())
        }
        body.push(renderList(rows))
        continue
      }

      const paragraph = [trimmed]
      while (
        index < lines.length - 1 &&
        lines[index + 1].trim() &&
        !/^(#{1,4}\s+|---|\[\^|<figure|<div class="gallery"|\|.+\|$|\d+\.\s+|-\s+)/.test(lines[index + 1].trim())
      ) {
        index += 1
        paragraph.push(lines[index].trim())
      }
      const paragraphText = paragraph.join(' ')
      const classes = []
      if (isGuideNote(paragraphText)) classes.push('scuba-guide-note')
      if (nextParagraphIsSummary) classes.push('scuba-guide-summary')
      nextParagraphIsSummary = false
      const className = classes.length ? ` class="${classes.join(' ')}"` : ''
      body.push(`<p${className}>${formatInline(paragraphText)}</p>`)
    }

    return {
      title,
      subtitle,
      byline,
      toc,
      html: body.join('\n'),
      footnotes,
    }
  }

  $: guide = parseGuide(guideMarkdownByLanguage[currentLanguage] || guideMarkdownEn)
  $: partLinks = guide.toc.filter((item) => item.id.startsWith('part-'))
  let guideBodyElement
  let contentsVisible = false

  onMount(async () => {
    await tick()

    const updateContentsVisibility = () => {
      if (!guideBodyElement) {
        contentsVisible = false
        return
      }

      contentsVisible = guideBodyElement.getBoundingClientRect().top <= 112
    }

    updateContentsVisibility()
    window.addEventListener('scroll', updateContentsVisibility, { passive: true })
    window.addEventListener('resize', updateContentsVisibility)

    if (window.location.hash) {
      const target = document.getElementById(window.location.hash.slice(1))

      if (target) {
        target.scrollIntoView()
        window.requestAnimationFrame(updateContentsVisibility)
      }
    }

    return () => {
      window.removeEventListener('scroll', updateContentsVisibility)
      window.removeEventListener('resize', updateContentsVisibility)
    }
  })
</script>

<div class="relative z-10 flex w-full max-w-6xl flex-col gap-12 pb-20 pt-24 md:pt-28">
  <header class="grid gap-10 lg:grid-cols-[0.78fr_1fr] lg:items-end">
    <div class="flex flex-col gap-6">
      <p class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
        {t.scuba.eyebrow}
      </p>
      <div class="grid gap-5">
        <h1 class="font-greeting text-5xl font-semibold italic leading-none text-[var(--color-text-primary)] sm:text-6xl lg:text-7xl">
          {guide.title}
        </h1>
        <p class="max-w-2xl text-xl leading-relaxed text-[var(--color-text-secondary)]">
          {guide.subtitle}
        </p>
      </div>
      <p class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
        {t.scuba.byline}
      </p>
    </div>

    <figure class="overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]">
      <img
        class="aspect-[4/3] w-full object-cover"
        src="/images/scuba/community_dive.webp"
        alt="A group of divers at the surface in Puget Sound"
        width="1800"
        height="1350"
      />
      <figcaption class="px-5 py-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        {t.scuba.heroCaption}
      </figcaption>
    </figure>
  </header>

  <section
    class="grid gap-5 border-y border-[var(--color-border)] py-7 md:grid-cols-[auto_1fr] md:items-center"
    aria-labelledby="scuba-guide-navigation"
  >
    <div>
      <h2 id="scuba-guide-navigation" class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
        {t.scuba.jumpToPart}
      </h2>
    </div>

    <nav class="flex flex-wrap gap-x-5 gap-y-3 md:justify-end" aria-label={t.scuba.partNavigation}>
      {#each partLinks as item}
        <a
          class="slide-link pb-1 text-sm font-semibold uppercase leading-relaxed tracking-widest"
          href={`#${item.id}`}
          aria-label={item.text}
        >
          <span>{getPartLabel(item)}</span>
        </a>
      {/each}
    </nav>
  </section>

  <div class="grid gap-10 lg:block lg:pl-72" bind:this={guideBodyElement}>
    <aside
      class={[
        'hidden lg:fixed lg:left-[max(2rem,calc((100vw-72rem)/2))] lg:top-24 lg:z-20 lg:block lg:w-52 lg:transition lg:duration-300',
        contentsVisible ? 'lg:translate-y-0 lg:opacity-100' : 'lg:pointer-events-none lg:translate-y-3 lg:opacity-0',
      ]}
    >
      <nav
        class="max-h-[calc(100svh-7rem)] overflow-auto border-l border-[var(--color-border)] pl-5 pr-2"
        aria-label={t.scuba.tableOfContents}
      >
        <p class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
          {t.scuba.contents}
        </p>
        <ol class="mt-5 grid gap-3">
          {#each guide.toc as item}
            <li>
              <a class="text-xs leading-relaxed text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]" href={`#${item.id}`}>
                {item.text}
              </a>
            </li>
          {/each}
        </ol>
      </nav>
    </aside>

    <article class="scuba-guide min-w-0">
      {@html guide.html}

      {#if guide.footnotes.length}
        <section class="scuba-guide-notes" aria-labelledby="scuba-guide-notes">
          <h2 id="scuba-guide-notes">{t.scuba.sourcesAndNotes}</h2>
          <ol>
            {#each guide.footnotes as note}
              <li id={`note-${note.id}`}>{@html note.text}</li>
            {/each}
          </ol>
        </section>
      {/if}
    </article>
  </div>
</div>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }

  .scuba-guide {
    color: var(--color-text-primary);
  }

  .scuba-guide :global(h2),
  .scuba-guide :global(h3),
  .scuba-guide :global(h4) {
    scroll-margin-top: 6rem;
  }

  .scuba-guide :global(h2) {
    margin-top: 5.5rem;
    border: 1px solid rgb(16 32 30 / 0.92);
    background: var(--color-text-primary);
    padding: clamp(0.95rem, 1.8vw, 1.3rem);
    font-family: "Cormorant Garamond Variable", Cormorant, Garamond, serif;
    font-size: clamp(1.8rem, 3.4vw, 3rem);
    font-style: italic;
    font-weight: 600;
    line-height: 1.05;
    color: var(--color-background);
  }

  .scuba-guide :global(h2:first-child) {
    margin-top: 0;
  }

  .scuba-guide :global(h2 a) {
    color: inherit;
  }

  .scuba-guide :global(h3) {
    margin-top: 2.5rem;
    max-width: 66ch;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
  }

  .scuba-guide :global(h4) {
    margin-top: 2.25rem;
    max-width: 42ch;
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 650;
    line-height: 1.15;
  }

  .scuba-guide :global(p),
  .scuba-guide :global(li) {
    max-width: 66ch;
    font-size: clamp(1.06rem, 1.8vw, 1.2rem);
    line-height: 1.78;
    color: rgb(49 67 63);
  }

  .scuba-guide :global(p) {
    margin-top: 1.25rem;
  }

  .scuba-guide :global(.scuba-guide-note) {
    border: 1px solid rgb(13 124 134 / 0.24);
    border-left: 0.28rem solid var(--color-accent);
    background: rgb(237 244 241 / 0.86);
    padding: 1rem 1.15rem;
    color: var(--color-text-primary);
  }

  .scuba-guide :global(.scuba-guide-note em) {
    font-style: italic;
  }

  .scuba-guide :global(.scuba-guide-summary-label) {
    margin-top: 1.6rem;
    color: var(--color-accent-hover);
  }

  .scuba-guide :global(.scuba-guide-summary) {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    padding: 1.05rem 1.2rem;
    color: rgb(49 67 63);
  }

  .scuba-guide :global(ul),
  .scuba-guide :global(ol) {
    margin-top: 1.25rem;
    max-width: 66ch;
    padding-left: 1.4rem;
  }

  .scuba-guide :global(ul) {
    list-style: disc;
  }

  .scuba-guide :global(ol) {
    list-style: decimal;
  }

  .scuba-guide :global(li + li) {
    margin-top: 0.55rem;
  }

  .scuba-guide :global(strong) {
    color: var(--color-text-primary);
    font-weight: 700;
  }

  .scuba-guide :global(a) {
    color: var(--color-accent-hover);
    text-decoration: underline;
    text-underline-offset: 0.18em;
  }

  .scuba-guide :global(sup a) {
    text-decoration: none;
  }

  .scuba-guide :global(.scuba-guide-figure) {
    margin: 2rem 0;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .scuba-guide :global(.scuba-guide-figure img),
  .scuba-guide :global(.scuba-guide-gallery img) {
    display: block;
    width: 100%;
    object-fit: cover;
  }

  .scuba-guide :global(.scuba-guide-figure img) {
    aspect-ratio: 4 / 3;
  }

  .scuba-guide :global(figcaption) {
    border-top: 1px solid var(--color-border);
    border-left: 0.28rem solid rgb(13 124 134 / 0.42);
    background: rgb(237 244 241 / 0.78);
    padding: 0.85rem 1rem 0.95rem;
    font-size: 0.92rem;
    font-style: italic;
    line-height: 1.55;
    color: var(--color-text-secondary);
  }

  .scuba-guide :global(.scuba-guide-gallery) {
    display: grid;
    gap: 1rem;
    margin: 2rem 0;
  }

  .scuba-guide :global(.scuba-guide-gallery figure) {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .scuba-guide :global(.scuba-guide-gallery img) {
    aspect-ratio: 1 / 1;
  }

  .scuba-guide :global(.scuba-table-wrap) {
    margin: 2rem 0;
    overflow-x: auto;
    border: 1px solid var(--color-border);
    background: rgb(237 244 241 / 0.52);
  }

  .scuba-guide :global(table) {
    width: 100%;
    min-width: 42rem;
    border-collapse: collapse;
    font-size: 0.95rem;
  }

  .scuba-guide :global(th),
  .scuba-guide :global(td) {
    border-bottom: 1px solid var(--color-border);
    padding: 0.9rem 1rem;
    text-align: left;
    vertical-align: top;
  }

  .scuba-guide :global(th) {
    color: var(--color-text-primary);
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .scuba-guide :global(td) {
    color: rgb(49 67 63);
  }

  .scuba-guide-notes {
    margin-top: 5rem;
    max-width: 66ch;
    border-top: 1px solid var(--color-border);
    padding-top: 2.5rem;
  }

  @media (max-width: 900px) {
    .scuba-guide :global(h2) {
      margin-top: 4.25rem;
      padding: 0.9rem 1rem;
    }
  }

  @media (min-width: 760px) {
    .scuba-guide :global(.scuba-guide-figure-right) {
      float: right;
      width: min(22rem, 45%);
      margin: 0.5rem 0 1.5rem 2rem;
    }

    .scuba-guide :global(.scuba-guide-figure-left) {
      float: left;
      width: min(22rem, 45%);
      margin: 0.5rem 2rem 1.5rem 0;
    }

    .scuba-guide :global(.scuba-guide-gallery) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
