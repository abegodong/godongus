<script>
  export let t

  const emailParts = ['hello', 'godong.net']
  const phoneParts = ['206', '922', '4500']

  const email = emailParts.join('@')
  const phone = phoneParts.join('.')
</script>

<dl class="mt-8 grid gap-4 text-sm uppercase tracking-widest text-[var(--color-text-secondary)]">
  <div>
    <dt class="font-semibold text-[var(--color-text-primary)]">{t.contact.email}</dt>
    <dd class="mt-1 normal-case tracking-normal text-[var(--color-text-secondary)]">
      {email}
    </dd>
  </div>
  <div>
    <dt class="font-semibold text-[var(--color-text-primary)]">{t.contact.phone}</dt>
    <dd class="mt-1 normal-case tracking-normal text-[var(--color-text-secondary)]">
      {phone}
    </dd>
  </div>
</dl>
