<script>
  import PageHeader from './PageHeader.svelte'

  export let t
</script>

<div class="reveal-page relative z-10 flex w-full max-w-5xl flex-col gap-12 pb-16 pt-24 md:pt-28">
  <PageHeader
    eyebrow={t.scuba.eyebrow}
    title={t.scuba.title}
    intro={t.scuba.intro}
  />

  <section
    class="grid gap-8 border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:grid-cols-[0.72fr_1fr] md:gap-10 md:p-8"
    data-reveal
    style="--reveal-index: 1"
  >
    <div class="flex flex-col gap-6">
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
          {t.scuba.source}
        </p>
        <h2 class="font-greeting mt-2 text-3xl font-semibold italic leading-tight text-[var(--color-text-primary)] sm:text-4xl">
          {t.scuba.feedTitle}
        </h2>
      </div>

      <p class="text-base leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">
        {t.scuba.feedBody}
      </p>
    </div>

    <div class="grid min-h-80 place-items-center border border-[var(--color-border)] bg-[var(--color-background)] p-8 text-center">
      <p class="max-w-sm text-lg leading-relaxed text-[var(--color-text-secondary)]">
        {t.scuba.emptyState}
      </p>
    </div>
  </section>
</div>
