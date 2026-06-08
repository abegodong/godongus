<script>
  import ContactDetails from './ContactDetails.svelte'
  import PageHeader from './PageHeader.svelte'

  export let t
  export let contactSubmitted
  export let contactStatus
  export let contactError
  export let contactForm
  export let turnstileSiteKey = ''
  export let onSubmit
  export let onReset
</script>

<div class="reveal-page relative z-10 flex w-full max-w-4xl flex-col gap-10 pb-16 pt-24 md:pt-28">
  <div class="grid gap-10 lg:grid-cols-[0.8fr_1fr] lg:items-start">
    <div>
      <PageHeader
        title={t.contact.title}
        intro={t.contact.intro}
        maxWidth="max-w-md"
      />
      <ContactDetails {t} />
    </div>

    {#if contactSubmitted}
      <div class="border-l border-[var(--color-border)] pl-6" data-reveal style="--reveal-index: 1">
        <h2 class="text-2xl font-semibold text-[var(--color-text-primary)]">{t.contact.thankYou}</h2>
        <p class="mt-3 text-lg leading-relaxed text-[var(--color-text-secondary)]">
          {t.contact.thankYouBody}
        </p>
        <button
          class="slide-link mt-8 text-sm font-semibold uppercase tracking-widest"
          type="button"
          on:click={onReset}
        >
          {t.contact.sendAnother}
        </button>
      </div>
    {:else}
      <form class="grid gap-6" data-reveal style="--reveal-index: 1" on:submit|preventDefault={onSubmit}>
        <label class="grid gap-2">
          <span class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            {t.contact.name}
          </span>
          <input
            class="border-b border-[var(--color-border)] bg-transparent py-3 text-lg text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-text-primary)]"
            name="name"
            autocomplete="name"
            bind:value={contactForm.name}
            required
          />
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            {t.contact.email}
          </span>
          <input
            class="border-b border-[var(--color-border)] bg-transparent py-3 text-lg text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-text-primary)]"
            name="email"
            type="email"
            autocomplete="email"
            bind:value={contactForm.email}
            required
          />
        </label>

        <label class="hidden" aria-hidden="true">
          Company
          <input name="company" tabindex="-1" autocomplete="off" bind:value={contactForm.company} />
        </label>
        <input type="hidden" name="ipAddress" bind:value={contactForm.ipAddress} />
        <input type="hidden" name="turnstileToken" bind:value={contactForm.turnstileToken} />

        <label class="grid gap-2">
          <span class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            {t.contact.message}
          </span>
          <textarea
            class="min-h-40 resize-y border-b border-[var(--color-border)] bg-transparent py-3 text-lg leading-relaxed text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-text-primary)]"
            name="message"
            bind:value={contactForm.message}
            required
          ></textarea>
        </label>

        {#if contactError}
          <p class="text-sm font-semibold text-[var(--color-accent-hover)]" role="alert">
            {contactError}
          </p>
        {/if}

        {#if turnstileSiteKey}
          <div id="contact-turnstile" class="sr-only" aria-hidden="true"></div>
        {/if}

        <button
          class="slide-link ml-auto mt-2 text-sm font-semibold uppercase tracking-widest"
          type="submit"
          disabled={contactStatus === 'sending'}
        >
          {contactStatus === 'sending' ? t.contact.sending : t.contact.send}
        </button>
      </form>
    {/if}
  </div>
</div>
