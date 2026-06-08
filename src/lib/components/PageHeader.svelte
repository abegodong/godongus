<script>
  export let eyebrow = ''
  export let title
  export let intro = ''
  export let revealIndex = 0
  export let maxWidth = 'max-w-3xl'
  export let titleClass = 'text-6xl sm:text-7xl'
</script>

<header class={maxWidth} data-reveal style={`--reveal-index: ${revealIndex}`}>
  {#if eyebrow}
    <p class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
      {eyebrow}
    </p>
  {/if}

  <h1 class={`font-greeting ${eyebrow ? 'mt-4' : ''} font-semibold italic leading-none ${titleClass}`}>
    {title}
  </h1>

  {#if intro}
    <p class="mt-6 text-lg leading-relaxed text-[var(--color-text-secondary)]">
      {intro}
    </p>
  {/if}
</header>
