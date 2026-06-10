<script>
  import { onMount, tick } from 'svelte'
  import guideMarkdown from '../data/pnw-diving-field-guide.md?raw'

  export let t

  const imageBase = '/images/scuba/'
  const slugCounts = new Map()
  const guideUi = {
    byline: 'Written by Abraham Godong',
    heroCaption: 'A shareable field guide for divers making the leap into cold Pacific Northwest water.',
    partNavigation: 'Salish Sea diving guide parts',
    sourcesAndNotes: 'Sources and Notes',
  }
  const stableHeadingIds = [
    'preface',
    'part-1-why-the-salish-sea',
    'part-2-getting-started',
    'part-3-gear-that-matters',
    'part-4-find-your-community',
    'part-5-reading-the-water',
    'part-6-underwater-life',
    'part-7-where-to-dive',
    'part-8-what-comes-next',
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

  const formatInline = (value = '', footnoteNumbers = new Map()) => {
    let formatted = escapeHtml(value)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
      .replace(/\[\^([^\]]+)\]/g, (_match, id) => `<sup><a href="#note-${id}">${footnoteNumbers.get(id) || id}</a></sup>`)
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
    const textMatch = item.text.match(/^Part\s+(\d+)/i)
    if (textMatch) return `Part ${textMatch[1]}`

    const idMatch = item.id.match(/^part-(\d+)/)
    return idMatch ? `Part ${idMatch[1]}` : item.text
  }

  const getPartTitle = (item) =>
    item.text.replace(/^Part\s+\d+\s+—\s+/, '')

  const isGuideNote = (value = '') =>
    /^\*One note before we begin:/i.test(value)

  const isSummaryHeading = (value = '') => /^Summary$/i.test(value)

  const parseGuide = (markdown) => {
    slugCounts.clear()

    const lines = markdown.replace(/\r\n/g, '\n').split('\n')
    const footnoteNumbers = new Map()
    lines.forEach((line) => {
      const match = line.trim().match(/^\[\^([^\]]+)\]:\s*(.+)$/)
      if (match && !footnoteNumbers.has(match[1])) {
        footnoteNumbers.set(match[1], footnoteNumbers.size + 1)
      }
    })
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
          footnotes.push({ id: match[1], text: formatInline(match[2], footnoteNumbers) })
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

      if (!byline && /^\*\*By\s+Abraham(?:\s+Godong)?\*\*/.test(trimmed)) {
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
        body.push(`<h2 id="${id}">${formatInline(text, footnoteNumbers)}</h2>`)
        continue
      }

      if (trimmed.startsWith('### ')) {
        const text = trimmed.replace(/^###\s+/, '')
        const id = slugify(text)
        const summaryHeading = isSummaryHeading(text)
        nextParagraphIsSummary = summaryHeading
        body.push(`<h3 id="${id}"${summaryHeading ? ' class="scuba-guide-summary-label"' : ''}>${formatInline(text, footnoteNumbers)}</h3>`)
        continue
      }

      if (trimmed.startsWith('#### ')) {
        const text = trimmed.replace(/^####\s+/, '')
        const id = slugify(text)
        body.push(`<h4 id="${id}">${formatInline(text, footnoteNumbers)}</h4>`)
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
      body.push(`<p${className}>${formatInline(paragraphText, footnoteNumbers)}</p>`)
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

  const guide = parseGuide(guideMarkdown)
  $: guideLinks = guide.toc.filter((item) => item.id === 'preface' || item.id.startsWith('part-'))
  $: currentGuideIndex = Math.max(0, guideLinks.findIndex((item) => item.id === activeGuideId))
  $: currentGuideItem = guideLinks[currentGuideIndex] || guideLinks[0]
  $: previousGuideItem = currentGuideIndex > 0 ? guideLinks[currentGuideIndex - 1] : null
  $: nextGuideItem = currentGuideIndex < guideLinks.length - 1 ? guideLinks[currentGuideIndex + 1] : null
  let guideBodyElement
  let articleTransitioning = false
  let guideNavOpen = false
  let activeGuideId = 'preface'
  let transitionTimer

  const jumpToSection = (target) => {
    const guideNav = document.querySelector('[aria-label="Guide navigation"]')
    const guideRect = guideNav?.getBoundingClientRect()
    const guideOffset = guideRect ? guideRect.top + guideRect.height + 18 : 112
    const top = target.getBoundingClientRect().top + window.scrollY - guideOffset
    window.scrollTo({ top, behavior: 'auto' })
  }

  const navigateToSectionWithFade = async (event, id) => {
    event.preventDefault()

    const target = document.getElementById(id)
    if (!target) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      jumpToSection(target)
      window.history.pushState(null, '', `#${id}`)
      activeGuideId = id
      guideNavOpen = false
      return
    }

    window.clearTimeout(transitionTimer)
    articleTransitioning = true

    await new Promise((resolve) => {
      transitionTimer = window.setTimeout(resolve, 160)
    })

    jumpToSection(target)
    window.history.pushState(null, '', `#${id}`)
    activeGuideId = id
    guideNavOpen = false

    transitionTimer = window.setTimeout(() => {
      articleTransitioning = false
    }, 80)
  }

  const handleGuideNavOverlayKeydown = (event) => {
    if (event.key === 'Escape') {
      guideNavOpen = false
    }
  }

  onMount(async () => {
    await tick()

    const updateActiveGuideId = () => {
      const markerOffset = 140
      const activeItem = [...guideLinks].reverse().find((item) => {
        const element = document.getElementById(item.id)
        return element && element.getBoundingClientRect().top <= markerOffset
      })

      activeGuideId = activeItem?.id || guideLinks[0]?.id || 'preface'
    }

    updateActiveGuideId()
    window.addEventListener('scroll', updateActiveGuideId, { passive: true })

    if (window.location.hash) {
      const target = document.getElementById(window.location.hash.slice(1))

      if (target) {
        jumpToSection(target)
        window.requestAnimationFrame(updateActiveGuideId)
      }
    }

    return () => {
      window.clearTimeout(transitionTimer)
      window.removeEventListener('scroll', updateActiveGuideId)
    }
  })
</script>

<div class={['scuba-guide-shell relative z-10 flex w-full max-w-6xl flex-col gap-12 pb-20 pt-24 md:pt-28', articleTransitioning && 'scuba-guide-transitioning']}>
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
        {guideUi.byline}
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
        {guideUi.heroCaption}
      </figcaption>
    </figure>
  </header>

  <section
    class="sticky top-20 z-30 w-full max-w-[66ch] self-center border border-[var(--color-border)] bg-[rgb(250_248_241_/_0.82)] px-3 py-3 shadow-sm backdrop-blur-md md:top-16 lg:top-4"
    aria-label="Guide navigation"
  >
    <div class="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <button
        class="border border-[var(--color-border)] px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-primary)] transition hover:border-[var(--color-accent)] hover:bg-[rgb(237_244_241_/_0.76)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        type="button"
        aria-expanded={guideNavOpen}
        aria-controls="scuba-guide-parts-panel"
        onclick={() => (guideNavOpen = true)}
      >
        Guide
      </button>

      <div class="min-w-0">
        <p class="text-[0.68rem] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
          Current section
        </p>
        <p class="truncate text-sm font-semibold leading-relaxed text-[var(--color-text-primary)] sm:text-base">
          {currentGuideItem?.text}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        {#if previousGuideItem}
          <a
            class="border border-[var(--color-border)] px-3 py-2 text-center text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            href={`#${previousGuideItem.id}`}
            onclick={(event) => navigateToSectionWithFade(event, previousGuideItem.id)}
          >
            Previous
          </a>
        {:else}
          <span class="border border-transparent px-3 py-2 text-center text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)] opacity-40">
            Previous
          </span>
        {/if}

        {#if nextGuideItem}
          <a
            class="border border-[var(--color-border)] px-3 py-2 text-center text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            href={`#${nextGuideItem.id}`}
            onclick={(event) => navigateToSectionWithFade(event, nextGuideItem.id)}
          >
            Next
          </a>
        {:else}
          <span class="border border-transparent px-3 py-2 text-center text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)] opacity-40">
            Next
          </span>
        {/if}
      </div>
    </div>
  </section>

  {#if guideNavOpen}
    <div
      class="fixed inset-0 z-50 grid place-items-center bg-[rgb(16_32_30_/_0.28)] p-4 backdrop-blur-sm"
      role="presentation"
      onclick={() => (guideNavOpen = false)}
      onkeydown={handleGuideNavOverlayKeydown}
    >
      <div
        id="scuba-guide-parts-panel"
        class="w-full max-w-[26rem] max-h-[82svh] overflow-auto border border-[var(--color-border)] bg-[var(--color-background)] p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={guideUi.partNavigation}
        tabindex="-1"
        onclick={(event) => event.stopPropagation()}
        onkeydown={(event) => event.stopPropagation()}
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
              Guide navigation
            </p>
            <h2 class="mt-2 font-greeting text-3xl font-semibold italic leading-none text-[var(--color-text-primary)]">
              Choose a section
            </h2>
          </div>
          <button
            class="border border-[var(--color-border)] px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            type="button"
            onclick={() => (guideNavOpen = false)}
          >
            Close
          </button>
        </div>

        <ol class="mt-6 grid gap-2">
          {#each guideLinks as item}
            <li>
              <a
                class={[
                  'grid gap-1 border px-3 py-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]',
                  item.id === activeGuideId
                    ? 'border-[var(--color-accent)] bg-[rgb(237_244_241_/_0.86)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[rgb(237_244_241_/_0.54)]',
                ]}
                href={`#${item.id}`}
                aria-current={item.id === activeGuideId ? 'location' : undefined}
                onclick={(event) => navigateToSectionWithFade(event, item.id)}
              >
                <span class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
                  {getPartLabel(item)}
                </span>
                <span class="text-base font-semibold leading-snug text-[var(--color-text-primary)]">
                  {getPartTitle(item)}
                </span>
              </a>
            </li>
          {/each}
        </ol>
      </div>
    </div>
  {/if}

  <div class="grid justify-items-center" bind:this={guideBodyElement}>
    <article class="scuba-guide min-w-0 w-full max-w-[66ch]">
      {@html guide.html}

      {#if guide.footnotes.length}
        <section class="scuba-guide-notes" aria-labelledby="scuba-guide-notes">
          <h2 id="scuba-guide-notes">{guideUi.sourcesAndNotes}</h2>
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
  .scuba-guide-shell {
    opacity: 1;
    transition: opacity 180ms ease;
  }

  .scuba-guide-transitioning {
    opacity: 0;
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
    color: var(--color-text-secondary);
    font-size: 0.92rem;
    line-height: 1.65;
  }

  .scuba-guide-notes :global(h2) {
    background: transparent;
    border-color: var(--color-border);
    color: var(--color-text-primary);
    font-size: clamp(1.35rem, 2vw, 1.8rem);
  }

  .scuba-guide-notes :global(ol) {
    display: grid;
    gap: 0.85rem;
    padding-left: 1.35rem;
  }

  .scuba-guide-notes :global(li) {
    padding-left: 0.25rem;
  }

  @media (max-width: 900px) {
    .scuba-guide :global(h2) {
      margin-top: 4.25rem;
      padding: 0.9rem 1rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .scuba-guide-shell {
      transition: none;
    }

    .scuba-guide-transitioning {
      opacity: 1;
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
