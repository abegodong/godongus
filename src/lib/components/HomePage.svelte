<script>
  export let t
  export let lines
  export let typedLines
  export let activeLine
  export let paragraphDone
  export let onNavigate
</script>

<div
  class="relative z-10 flex min-h-96 w-full max-w-4xl flex-col items-start justify-center"
  aria-live="polite"
>
  <h1
    class={[
      'font-greeting relative min-h-[1.05em] text-7xl font-semibold italic leading-none transition-transform duration-700 ease-out sm:text-8xl md:text-9xl',
      activeLine > 0 ? '-translate-y-8 sm:-translate-y-10 md:-translate-y-12' : 'translate-y-0',
    ]}
  >
    <span class="sr-only">{lines[0]}</span>
    <span class="invisible block" aria-hidden="true">{lines[0]}</span>
    <span class="absolute inset-x-0 top-0" aria-hidden="true">{typedLines[0]}</span>
  </h1>

  <p
    class="relative ml-[8vw] max-w-2xl text-xl font-medium leading-snug text-[var(--color-text-secondary)] sm:ml-[12vw] sm:text-2xl md:ml-36 md:text-3xl"
  >
    <span class="sr-only">{lines[1]}</span>
    <span class="invisible block" aria-hidden="true">{lines[1]}</span>
    <span class="absolute inset-x-0 top-0" aria-hidden="true">{typedLines[1]}</span>
  </p>

  <nav
    class={[
      'ml-[8vw] mt-8 flex w-[calc(100%-8vw)] max-w-2xl flex-nowrap items-center gap-4 transition-all duration-700 sm:ml-[12vw] sm:w-[calc(100%-12vw)] md:ml-36 md:w-[calc(100%-9rem)]',
      paragraphDone ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
    ]}
    aria-label={t.nav.nextSteps}
  >
    <a class="slide-link text-sm font-semibold uppercase tracking-widest" href="/insights">
      {t.home.links.insights}
    </a>
    <a
      class="slide-link text-sm font-semibold uppercase tracking-widest"
      href="/salish-sea-diving"
      on:click={(event) => onNavigate(event, '/salish-sea-diving')}
    >
      {t.home.links.scuba}
    </a>
    <a
      class="slide-link ml-auto text-sm font-semibold uppercase tracking-widest"
      href="/hello"
      on:click={(event) => onNavigate(event, '/hello')}
    >
      {t.home.links.contact}
    </a>
  </nav>
</div>
