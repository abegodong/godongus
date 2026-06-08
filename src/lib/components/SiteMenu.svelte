<script>
  import { fade } from 'svelte/transition'

  export let t
  export let menuOpen
  export let menuItems
  export let onClose
  export let onNavigate
</script>

{#if menuOpen}
  <button
    class="fixed inset-0 z-40 bg-[rgb(248_250_247/0.58)] backdrop-blur-md"
    type="button"
    aria-label={t.nav.close}
    on:click={onClose}
  ></button>
  <div
    class="menu-modal fixed left-6 top-16 z-50 w-[min(22rem,calc(100vw-3rem))] border border-[rgb(214_225_221/0.7)] bg-[rgb(248_250_247/0.76)] px-7 py-8 shadow-[0_24px_70px_rgb(16_32_30/0.12)] backdrop-blur-xl"
    role="dialog"
    aria-modal="true"
    aria-label="Site menu"
    in:fade={{ duration: 180 }}
    out:fade={{ duration: 140 }}
  >
    <div class="flex items-start justify-between gap-6">
      <p class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
        {t.nav.navigate}
      </p>
      <button
        class="slide-link text-sm font-semibold uppercase tracking-widest"
        type="button"
        on:click={onClose}
      >
        {t.nav.close}
      </button>
    </div>

    <nav class="mt-10 grid gap-5" aria-label={t.nav.primaryNavigation}>
      {#each menuItems as item}
        <a
          class="slide-link font-greeting text-4xl font-semibold italic leading-none text-[var(--color-text-primary)]"
          href={item.href}
          on:click={(event) => onNavigate(event, item.href)}
        >
          {item.label}
        </a>
      {/each}
    </nav>
  </div>
{/if}
