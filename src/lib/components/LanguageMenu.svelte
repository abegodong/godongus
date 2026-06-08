<script>
  import { fade } from 'svelte/transition'

  export let t
  export let languages
  export let currentLanguage
  export let activeLanguage
  export let languageMenuOpen
  export let controlsHidden
  export let onToggle
  export let onChangeLanguage
</script>

<div
  class={[
    'language-control site-control fixed right-[calc(var(--signature-size)+2rem)] top-5 z-30',
    controlsHidden ? 'site-control-hidden' : '',
  ]}
>
  <button
    class="language-trigger"
    type="button"
    aria-label={t.nav.language}
    aria-haspopup="listbox"
    aria-expanded={languageMenuOpen}
    aria-controls="language-menu"
    on:click|stopPropagation={onToggle}
  >
    <svg class="language-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M3 12h18"></path>
      <path d="M12 3c2.25 2.45 3.4 5.45 3.4 9s-1.15 6.55-3.4 9"></path>
      <path d="M12 3c-2.25 2.45-3.4 5.45-3.4 9s1.15 6.55 3.4 9"></path>
    </svg>
    <span class="language-code">{activeLanguage.label}</span>
  </button>

  {#if languageMenuOpen}
    <div
      id="language-menu"
      class="language-menu"
      role="listbox"
      aria-label={t.nav.language}
      in:fade={{ duration: 140 }}
      out:fade={{ duration: 100 }}
    >
      {#each languages as language}
        <button
          class="language-option"
          class:language-option-active={language.code === currentLanguage}
          type="button"
          role="option"
          aria-selected={language.code === currentLanguage}
          on:click|stopPropagation={() => onChangeLanguage(language.code)}
        >
          <span>{language.label}</span>
          <span>{language.name}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
