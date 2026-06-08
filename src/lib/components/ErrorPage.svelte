<script>
  import { fade } from 'svelte/transition'
  import PageHeader from './PageHeader.svelte'

  export let t
  export let errorStatus
  export let errorTitle
  export let currentQuote
  export let quoteVisible
  export let onNavigate
</script>

<div class="reveal-page relative z-10 flex w-full max-w-3xl flex-col gap-10 pb-16 pt-24 md:pt-28">
  <div class="grid gap-8">
    <PageHeader
      eyebrow={`${t.error.label} ${errorStatus}`}
      title={errorTitle}
    />

    <div class="relative h-44 max-w-2xl sm:h-40" data-reveal style="--reveal-index: 1" aria-live="polite">
      {#if quoteVisible}
        <figure class="absolute inset-0" in:fade={{ duration: 700 }} out:fade={{ duration: 500 }}>
          <blockquote class="text-2xl font-medium leading-snug text-[var(--color-text-secondary)] sm:text-3xl">
            “{currentQuote.text}”
          </blockquote>
          <figcaption class="mt-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            {currentQuote.source}
          </figcaption>
        </figure>
      {/if}
    </div>

    <p class="max-w-xl text-lg leading-relaxed text-[var(--color-text-secondary)]" data-reveal style="--reveal-index: 2">
      {t.error.body}
    </p>
  </div>

  <nav
    class="flex flex-wrap items-center gap-6"
    data-reveal
    style="--reveal-index: 3"
    aria-label={t.error.actions}
  >
    <a
      class="slide-link text-sm font-semibold uppercase tracking-widest"
      href="/"
      on:click={(event) => onNavigate(event, '/')}
    >
      {t.menu.items[0].label}
    </a>
    <a
      class="slide-link text-sm font-semibold uppercase tracking-widest"
      href="/hello"
      on:click={(event) => onNavigate(event, '/hello')}
    >
      {t.menu.items[3].label}
    </a>
  </nav>
</div>
