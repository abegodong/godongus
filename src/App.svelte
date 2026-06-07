<script>
  import { onMount } from 'svelte'

  const lines = [
    'Hello,',
    'I am Abraham Godong, a software developer in Seattle building thoughtful, practical software. I write about where AI is headed, how it can help people work better, and what I am learning along the way.',
  ]
  let typedLines = ['', '']
  let activeLine = 0
  let paragraphDone = false

  onMount(() => {
    let letterTimer
    let nextLineTimer

    const typeLine = (lineIndex, letterIndex = 0) => {
      activeLine = lineIndex
      typedLines[lineIndex] = lines[lineIndex].slice(0, letterIndex + 1)
      typedLines = typedLines

      if (letterIndex < lines[lineIndex].length - 1) {
        letterTimer = window.setTimeout(() => typeLine(lineIndex, letterIndex + 1), 38)
        return
      }

      if (lineIndex < lines.length - 1) {
        nextLineTimer = window.setTimeout(() => typeLine(lineIndex + 1), 350)
      } else {
        paragraphDone = true
      }
    }

    const startTimer = window.setTimeout(() => typeLine(0), 350)

    return () => {
      window.clearTimeout(startTimer)
      window.clearTimeout(letterTimer)
      window.clearTimeout(nextLineTimer)
    }
  })
</script>

<section class="flex min-h-svh items-center justify-center bg-white px-6 text-neutral-950">
  <div
    class="flex min-h-96 w-full max-w-4xl flex-col items-start justify-center"
    aria-live="polite"
  >
    <h1
      class={[
        'font-greeting relative min-h-[1.05em] text-7xl font-semibold italic leading-none transition-transform duration-700 ease-out sm:text-8xl md:text-9xl',
        activeLine > 0 ? '-translate-y-8 sm:-translate-y-10 md:-translate-y-12' : 'translate-y-0',
      ]}
      aria-label={typedLines[0]}
    >
      <span class="invisible block" aria-hidden="true">{lines[0]}</span>
      <span class="absolute inset-x-0 top-0" aria-hidden="true">{typedLines[0]}</span>
    </h1>

    <p
      class="relative ml-[8vw] max-w-2xl text-xl font-medium leading-snug text-neutral-700 sm:ml-[12vw] sm:text-2xl md:ml-36 md:text-3xl"
      aria-label={typedLines[1]}
    >
      <span class="invisible block" aria-hidden="true">{lines[1]}</span>
      <span class="absolute inset-x-0 top-0" aria-hidden="true">{typedLines[1]}</span>
    </p>

    <nav
      class={[
        'ml-[8vw] mt-8 flex flex-wrap gap-4 transition-all duration-700 sm:ml-[12vw] md:ml-36',
        paragraphDone ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
      ]}
      aria-label="Next steps"
    >
      <a
        class="border-b border-neutral-950 pb-1 text-sm font-semibold uppercase tracking-widest text-neutral-950 transition-colors hover:border-neutral-500 hover:text-neutral-600"
        href="/insights"
      >
        Read my AI insights
      </a>
      <a
        class="border-b border-neutral-950 pb-1 text-sm font-semibold uppercase tracking-widest text-neutral-950 transition-colors hover:border-neutral-500 hover:text-neutral-600"
        href="/hello"
      >
        Contact me
      </a>
    </nav>
  </div>
</section>
