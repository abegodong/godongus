<script>
  import PageHeader from './PageHeader.svelte'

  export let t
  export let posts

  const getPostTimestamp = (post) => new Date(post.publishedAt).getTime()

  $: chronologicalPosts = [...posts].sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a))
  $: featuredPost = chronologicalPosts[0]
  $: remainingPosts = chronologicalPosts.slice(1)
</script>

<div class="reveal-page relative z-10 flex w-full max-w-5xl flex-col gap-14 pb-16 pt-24 md:pt-28">
  <PageHeader
    eyebrow={t.insights.eyebrow}
    title={t.insights.title}
    intro={t.insights.intro}
  />

  {#if featuredPost}
    <section
      class="grid gap-4 border border-[rgb(13_124_134/0.22)] bg-[var(--color-surface)] p-6 shadow-[0_22px_70px_rgb(16_32_30/0.08)] md:grid-cols-[0.82fr_1fr] md:gap-10"
      data-reveal
      style="--reveal-index: 1"
    >
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
          {t.insights.featured}
        </p>
        <h2 class="font-greeting mt-2 text-3xl font-semibold italic leading-tight text-[var(--color-text-primary)] sm:text-4xl">
          {featuredPost.title}
        </h2>
      </div>

      <div class="flex flex-col gap-4">
        <p class="text-base leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">
          {featuredPost.description}
        </p>
        <div class="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
          <span>{t.insights.preparedBy} {featuredPost.preparedBy}</span>
          <span>{featuredPost.publishedAt}</span>
          {#if featuredPost.readingTime}
            <span>{featuredPost.readingTime}</span>
          {/if}
          <span>{featuredPost.sourceLabel}</span>
        </div>
        <a
          class="slide-link w-fit text-sm font-semibold uppercase tracking-widest"
          href={featuredPost.href}
          target="_blank"
          rel="noreferrer"
        >
          {t.insights.read}
        </a>
      </div>
    </section>
  {/if}

  <div class="grid gap-8" data-reveal style="--reveal-index: 2">
    {#each remainingPosts as post}
      <article class="grid gap-4 border-t border-[var(--color-border)] pt-6 md:grid-cols-[0.82fr_1fr] md:gap-10">
        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            {post.category}
          </p>
          <h3 class="font-greeting mt-2 text-3xl font-semibold italic leading-tight text-[var(--color-text-primary)] sm:text-4xl">
            {post.title}
          </h3>
        </div>

        <div class="flex flex-col gap-4">
          <p class="text-base leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">
            {post.description}
          </p>
          <div class="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            <span>{t.insights.preparedBy} {post.preparedBy}</span>
            <span>{post.publishedAt}</span>
            {#if post.readingTime}
              <span>{post.readingTime}</span>
            {/if}
            <span>{post.sourceLabel}</span>
          </div>
          <a
            class="slide-link w-fit text-sm font-semibold uppercase tracking-widest"
            href={post.href}
            target="_blank"
            rel="noreferrer"
          >
            {t.insights.read}
          </a>
        </div>
      </article>
    {/each}
  </div>
</div>
