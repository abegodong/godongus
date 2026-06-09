<script>
  import { onMount } from 'svelte'
  import { fade, fly } from 'svelte/transition'
  import HomePage from './lib/components/HomePage.svelte'
  import LanguageMenu from './lib/components/LanguageMenu.svelte'
  import PageHeader from './lib/components/PageHeader.svelte'
  import SiteMenu from './lib/components/SiteMenu.svelte'
  import { insightPosts, knownRoutes, languages, siteName } from './lib/data/site.js'

  const initialTurnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

  const translations = {
    en: {
      nav: {
        menu: 'Menu',
        close: 'Close',
        navigate: 'Navigate',
        home: 'Home',
        primaryNavigation: 'Primary navigation',
        nextSteps: 'Next steps',
        language: 'Select language',
      },
      menu: {
        items: [
          { href: '/', label: 'Return home' },
          { href: '/insights', label: 'Writing' },
          { href: '/scuba-life', label: 'PNW diving guide' },
          { href: '/hello', label: 'Write to me' },
        ],
      },
      home: {
        lines: [
          'Hello,',
          'This website is where I share what I build as a software developer, what I am learning about AI, product, and practical engineering, and notes from my life as a scuba diver. Read my ideas, explore my scuba notes, or reach out to start a conversation.',
        ],
        links: {
          insights: 'Read my writing',
          scuba: 'Read my diving guide',
          contact: 'Write to me',
        },
      },
      contact: {
        title: 'Write to me',
        intro:
          'Have a software idea, a question about my AI notes, or a shared interest in scuba? Send a short note and I will get back to you.',
        email: 'Email',
        phone: 'Phone',
        name: 'Name',
        message: 'Message',
        send: 'Send message',
        sending: 'Sending...',
        sendError: 'Something went wrong while sending. Please try again in a moment.',
        thankYou: 'Thank you.',
        thankYouBody:
          'Your message has been sent. I will get back to you soon.',
        sendAnother: 'Send another',
      },
      insights: {
        eyebrow: 'Writing',
        title: 'Essays from the field.',
        intro:
          'A curated index of writing I prepared for Bumi Cakra Teknologi and GoJago, covering AI, software engineering, web strategy, security, accessibility, and the human systems around technology.',
        preparedBy: 'Prepared by',
        source: 'As posted in bumicakra.com',
        read: 'Read original',
        featured: 'Featured writing',
      },
      scuba: {
        eyebrow: 'PNW diving guide',
        title: 'Diving the Pacific Northwest.',
        intro:
          'A field guide for divers making the leap into cold Pacific Northwest water, written and photographed from my own experience in the Salish Sea.',
        source: 'Dive journal',
        feedTitle: 'Photos, videos, and field notes',
        feedBody:
          'This page is ready for a first-party dive archive, so the photos and videos can live here cleanly without depending on a social feed.',
        emptyState: 'Dive entries will appear here as the archive grows.',
      },
      error: {
        label: 'Error',
        title404: 'This page drifted off course.',
        title500: 'Something surfaced wrong.',
        body:
          'The route you tried is not available right now. Head back home, or send a note if something should be here.',
        actions: 'Error page actions',
        quotes: [
          {
            text: 'It does not matter how slowly you go as long as you do not stop.',
            source: 'Confucius',
          },
          {
            text: 'Real knowledge is to know the extent of one’s ignorance.',
            source: 'Confucius',
          },
          {
            text: 'Plan the dive, dive the plan.',
            source: 'Scuba note',
          },
          {
            text: 'Stay calm, check your gauges, and ascend with intention.',
            source: 'Scuba note',
          },
        ],
      },
      seo: {
        routes: {
          '/': {
            title: 'Abraham Godong | Software, AI Notes, and Scuba Life',
            description:
              'Abraham Godong shares software work, practical AI and product notes, engineering ideas, and scuba life.',
            robots: 'index, follow',
          },
          '/hello': {
            title: 'Write to Abraham Godong | Contact',
            description:
              'Send a note to Abraham Godong about software, AI, product thinking, engineering, or scuba.',
            robots: 'index, follow',
          },
          '/insights': {
            title: 'Writing by Abraham Godong | Software, AI, Web, and Human Systems',
            description:
              'Writing prepared by Abraham Godong for Bumi Cakra Teknologi and GoJago on AI, software engineering, web strategy, security, accessibility, and human systems.',
            robots: 'index, follow',
          },
          '/scuba-life': {
            title: 'Diving the Pacific Northwest | Abraham Godong',
            description:
              'A Pacific Northwest diving field guide by Abraham Godong, with practical notes on cold-water training, gear, tides, local sites, and Puget Sound marine life.',
            robots: 'index, follow',
          },
          '/style-guide': {
            title: 'Private Style Guide | Abraham Godong',
            description: 'A private visual style guide for Abraham Godong’s personal website.',
            robots: 'noindex, nofollow',
          },
          '/404': {
            title: 'Page Not Found | Abraham Godong',
            description: 'This page drifted off course. Return home or write to Abraham Godong.',
            robots: 'noindex, nofollow',
          },
          '/500': {
            title: 'Site Error | Abraham Godong',
            description: 'Something surfaced wrong. Return home or write to Abraham Godong.',
            robots: 'noindex, nofollow',
          },
        },
      },
    },
    id: {
      nav: {
        menu: 'Menu',
        close: 'Tutup',
        navigate: 'Navigasi',
        home: 'Beranda',
        primaryNavigation: 'Navigasi utama',
        nextSteps: 'Langkah berikutnya',
        language: 'Pilih bahasa',
      },
      menu: {
        items: [
          { href: '/', label: 'Kembali ke beranda' },
          { href: '/insights', label: 'Tulisan' },
          { href: '/scuba-life', label: 'Panduan diving PNW' },
          { href: '/hello', label: 'Tulis pesan' },
        ],
      },
      home: {
        lines: [
          'Halo,',
          'Situs ini adalah tempat saya berbagi hal yang saya bangun sebagai pengembang perangkat lunak, hal yang saya pelajari tentang AI, produk, dan rekayasa praktis, serta catatan dari kehidupan saya sebagai penyelam scuba. Baca ide saya, jelajahi catatan scuba saya, atau hubungi saya untuk memulai percakapan.',
        ],
        links: {
          insights: 'Baca tulisan saya',
          scuba: 'Baca panduan diving saya',
          contact: 'Tulis pesan',
        },
      },
      contact: {
        title: 'Tulis pesan',
        intro:
          'Punya ide perangkat lunak, pertanyaan tentang catatan AI saya, atau minat yang sama pada scuba? Kirim pesan singkat dan saya akan membalasnya.',
        email: 'Email',
        phone: 'Telepon',
        name: 'Nama',
        message: 'Pesan',
        send: 'Kirim pesan',
        sending: 'Mengirim...',
        sendError: 'Ada kendala saat mengirim. Silakan coba lagi sebentar lagi.',
        thankYou: 'Terima kasih.',
        thankYouBody: 'Pesan Anda sudah terkirim. Saya akan segera membalasnya.',
        sendAnother: 'Kirim lagi',
      },
      insights: {
        eyebrow: 'Tulisan',
        title: 'Esai dari lapangan.',
        intro:
          'Indeks pilihan dari tulisan yang saya siapkan untuk Bumi Cakra Teknologi dan GoJago, mencakup AI, software engineering, strategi web, keamanan, aksesibilitas, dan sistem manusia di sekitar teknologi.',
        preparedBy: 'Disiapkan oleh',
        source: 'Seperti diposting di bumicakra.com',
        read: 'Baca tulisan asli',
        featured: 'Tulisan pilihan',
      },
      scuba: {
        eyebrow: 'Panduan diving PNW',
        title: 'Menyelam di Pacific Northwest.',
        intro:
          'Panduan lapangan untuk penyelam yang mulai masuk ke air dingin Pacific Northwest, ditulis dan difoto dari pengalaman saya sendiri di Salish Sea.',
        source: 'Jurnal penyelaman',
        feedTitle: 'Foto, video, dan catatan lapangan',
        feedBody:
          'Halaman ini siap menjadi arsip penyelaman utama, sehingga foto dan video dapat hidup di sini tanpa bergantung pada feed sosial.',
        emptyState: 'Catatan penyelaman akan muncul di sini saat arsip bertambah.',
      },
      error: {
        label: 'Error',
        title404: 'Halaman ini melayang keluar jalur.',
        title500: 'Ada sesuatu yang muncul tidak semestinya.',
        body:
          'Rute yang Anda coba belum tersedia saat ini. Kembali ke beranda, atau kirim pesan jika sesuatu seharusnya ada di sini.',
        actions: 'Aksi halaman error',
        quotes: [
          {
            text: 'Tidak penting seberapa lambat kamu berjalan, selama kamu tidak berhenti.',
            source: 'Konfusius',
          },
          {
            text: 'Pengetahuan sejati adalah mengetahui batas ketidaktahuan sendiri.',
            source: 'Konfusius',
          },
          {
            text: 'Rencanakan penyelaman, selami sesuai rencana.',
            source: 'Catatan scuba',
          },
          {
            text: 'Tetap tenang, periksa alat ukur, dan naik dengan niat yang jelas.',
            source: 'Catatan scuba',
          },
        ],
      },
      seo: {
        routes: {
          '/': {
            title: 'Abraham Godong | Perangkat Lunak, Catatan AI, dan Scuba',
            description:
              'Abraham Godong berbagi karya perangkat lunak, catatan praktis tentang AI dan produk, ide rekayasa, dan kehidupan scuba.',
            robots: 'index, follow',
          },
          '/hello': {
            title: 'Tulis Pesan untuk Abraham Godong | Kontak',
            description:
              'Kirim pesan untuk Abraham Godong tentang perangkat lunak, AI, pemikiran produk, rekayasa, atau scuba.',
            robots: 'index, follow',
          },
          '/insights': {
            title: 'Tulisan Abraham Godong | Software, AI, Web, dan Sistem Manusia',
            description:
              'Tulisan yang disiapkan Abraham Godong untuk Bumi Cakra Teknologi dan GoJago tentang AI, software engineering, strategi web, keamanan, aksesibilitas, dan sistem manusia.',
            robots: 'index, follow',
          },
          '/scuba-life': {
            title: 'Menyelam di Pacific Northwest | Abraham Godong',
            description:
              'Panduan diving Pacific Northwest oleh Abraham Godong, dengan catatan praktis tentang latihan air dingin, perlengkapan, pasang surut, lokasi lokal, dan kehidupan laut Puget Sound.',
            robots: 'index, follow',
          },
          '/style-guide': {
            title: 'Style Guide Pribadi | Abraham Godong',
            description: 'Panduan visual pribadi untuk situs Abraham Godong.',
            robots: 'noindex, nofollow',
          },
          '/404': {
            title: 'Halaman Tidak Ditemukan | Abraham Godong',
            description: 'Halaman ini melayang keluar jalur. Kembali ke beranda atau tulis pesan.',
            robots: 'noindex, nofollow',
          },
          '/500': {
            title: 'Error Situs | Abraham Godong',
            description: 'Ada sesuatu yang muncul tidak semestinya. Kembali ke beranda atau tulis pesan.',
            robots: 'noindex, nofollow',
          },
        },
      },
    },
    es: {
      nav: {
        menu: 'Menu',
        close: 'Cerrar',
        navigate: 'Navegar',
        home: 'Inicio',
        primaryNavigation: 'Navegación principal',
        nextSteps: 'Siguientes pasos',
        language: 'Seleccionar idioma',
      },
      menu: {
        items: [
          { href: '/', label: 'Volver al inicio' },
          { href: '/insights', label: 'Escritos' },
          { href: '/scuba-life', label: 'Guía de buceo PNW' },
          { href: '/hello', label: 'Escríbeme' },
        ],
      },
      home: {
        lines: [
          'Hola,',
          'Este sitio es donde comparto lo que construyo como desarrollador de software, lo que estoy aprendiendo sobre AI, producto e ingeniería práctica, y notas de mi vida como buzo scuba. Lee mis ideas, explora mis notas de scuba o escríbeme para iniciar una conversación.',
        ],
        links: {
          insights: 'Lee mis escritos',
          scuba: 'Lee mi guía de buceo',
          contact: 'Escríbeme',
        },
      },
      contact: {
        title: 'Escríbeme',
        intro:
          '¿Tienes una idea de software, una pregunta sobre mis notas de AI o un interés compartido por el scuba? Envía una nota breve y te responderé.',
        email: 'Email',
        phone: 'Teléfono',
        name: 'Nombre',
        message: 'Mensaje',
        send: 'Enviar mensaje',
        sending: 'Enviando...',
        sendError: 'Algo salió mal al enviar. Inténtalo de nuevo en un momento.',
        thankYou: 'Gracias.',
        thankYouBody: 'Tu mensaje ha sido enviado. Te responderé pronto.',
        sendAnother: 'Enviar otro',
      },
      insights: {
        eyebrow: 'Escritura',
        title: 'Ensayos desde el campo.',
        intro:
          'Un índice curado de textos que preparé para Bumi Cakra Teknologi y GoJago sobre AI, ingeniería de software, estrategia web, seguridad, accesibilidad y los sistemas humanos alrededor de la tecnología.',
        preparedBy: 'Preparado por',
        source: 'Publicado originalmente en bumicakra.com',
        read: 'Leer original',
        featured: 'Texto destacado',
      },
      scuba: {
        eyebrow: 'Guía de buceo PNW',
        title: 'Bucear el Pacific Northwest.',
        intro:
          'Una guía de campo para buzos que dan el salto al agua fría del Pacific Northwest, escrita y fotografiada desde mi propia experiencia en el Salish Sea.',
        source: 'Diario de inmersiones',
        feedTitle: 'Fotos, videos y notas de campo',
        feedBody:
          'Esta página está lista para convertirse en un archivo propio de inmersiones, para que las fotos y videos vivan aquí sin depender de un feed social.',
        emptyState: 'Las entradas de buceo aparecerán aquí a medida que crezca el archivo.',
      },
      error: {
        label: 'Error',
        title404: 'Esta página se desvió del rumbo.',
        title500: 'Algo salió a la superficie de forma inesperada.',
        body:
          'La ruta que intentaste no está disponible ahora. Vuelve al inicio o envíame una nota si algo debería estar aquí.',
        actions: 'Acciones de la página de error',
        quotes: [
          {
            text: 'No importa qué tan despacio vayas, siempre que no te detengas.',
            source: 'Confucio',
          },
          {
            text: 'El conocimiento real es conocer el alcance de la propia ignorancia.',
            source: 'Confucio',
          },
          {
            text: 'Planifica la inmersión, bucea el plan.',
            source: 'Nota de scuba',
          },
          {
            text: 'Mantén la calma, revisa tus medidores y asciende con intención.',
            source: 'Nota de scuba',
          },
        ],
      },
      seo: {
        routes: {
          '/': {
            title: 'Abraham Godong | Software, Notas de AI y Vida Scuba',
            description:
              'Abraham Godong comparte trabajo de software, notas prácticas sobre AI y producto, ideas de ingeniería y vida scuba.',
            robots: 'index, follow',
          },
          '/hello': {
            title: 'Escribe a Abraham Godong | Contacto',
            description:
              'Envía una nota a Abraham Godong sobre software, AI, producto, ingeniería o scuba.',
            robots: 'index, follow',
          },
          '/insights': {
            title: 'Escritos de Abraham Godong | Software, AI, Web y Sistemas Humanos',
            description:
              'Textos preparados por Abraham Godong para Bumi Cakra Teknologi y GoJago sobre AI, ingeniería de software, estrategia web, seguridad, accesibilidad y sistemas humanos.',
            robots: 'index, follow',
          },
          '/scuba-life': {
            title: 'Bucear el Pacific Northwest | Abraham Godong',
            description:
              'Una guía de buceo del Pacific Northwest por Abraham Godong, con notas prácticas sobre entrenamiento en agua fría, equipo, mareas, sitios locales y vida marina de Puget Sound.',
            robots: 'index, follow',
          },
          '/style-guide': {
            title: 'Guía de Estilo Privada | Abraham Godong',
            description: 'Una guía visual privada para el sitio personal de Abraham Godong.',
            robots: 'noindex, nofollow',
          },
          '/404': {
            title: 'Página No Encontrada | Abraham Godong',
            description: 'Esta página se desvió del rumbo. Vuelve al inicio o escribe a Abraham Godong.',
            robots: 'noindex, nofollow',
          },
          '/500': {
            title: 'Error del Sitio | Abraham Godong',
            description: 'Algo salió a la superficie de forma inesperada. Vuelve al inicio o escribe.',
            robots: 'noindex, nofollow',
          },
        },
      },
    },
  }
  let typedLines = ['', '']
  let activeLine = 0
  let paragraphDone = false
  let pathname = '/'
  let currentLanguage = 'en'
  let contactSubmitted = false
  let contactStatus = 'idle'
  let contactError = ''
  let turnstileSiteKey = initialTurnstileSiteKey
  let contactForm = {
    name: '',
    email: '',
    message: '',
    company: '',
    ipAddress: '',
    turnstileToken: '',
  }
  let menuOpen = false
  let languageMenuOpen = false
  let controlsHidden = false
  let robotsMeta
  let canonicalLink
  let descriptionMeta
  let ogTitleMeta
  let ogDescriptionMeta
  let ogUrlMeta
  let ogSiteNameMeta
  let ogTypeMeta
  let twitterCardMeta
  let twitterTitleMeta
  let twitterDescriptionMeta
  let structuredDataScript
  let quoteIndex = 0
  let visibleQuoteIndex = 0
  let quoteVisible = true
  let restartHomeIntro = () => {}
  let routeKey = 0
  let ContactPageComponent
  let ErrorPageComponent
  let InsightsPageComponent
  let ScubaPageComponent
  let turnstileLoadPromise
  let turnstileWidgetId = null
  let pendingTurnstileResolve
  let pendingTurnstileReject

  $: t = translations[currentLanguage]
  $: lines = t.home.lines
  $: routeSeo = t.seo.routes
  $: defaultSeo = routeSeo['/']
  $: errorQuotes = t.error.quotes
  $: menuItems = t.menu.items
  $: isKnownRoute = knownRoutes.includes(pathname)
  $: isErrorRoute = pathname === '/404' || pathname === '/500' || !isKnownRoute
  $: errorStatus = pathname === '/500' ? '500' : '404'
  $: errorTitle = errorStatus === '500' ? t.error.title500 : t.error.title404
  $: currentQuote = errorQuotes[visibleQuoteIndex]
  $: activeSeo = isErrorRoute && !routeSeo[pathname] ? routeSeo['/404'] : routeSeo[pathname] || defaultSeo

  $: if (robotsMeta && activeSeo) {
    applySeo()
  }

  $: if (typeof document !== 'undefined') {
    document.documentElement.lang = currentLanguage
  }

  const getAbsoluteUrl = (path) => new URL(path, window.location.origin).href

  const ensureMeta = (selector, attributes) => {
    let element = document.head.querySelector(selector)

    if (!element) {
      element = document.createElement('meta')
      Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value))
      document.head.appendChild(element)
    }

    return element
  }

  const ensureCanonical = () => {
    let element = document.head.querySelector('link[rel="canonical"]')

    if (!element) {
      element = document.createElement('link')
      element.rel = 'canonical'
      document.head.appendChild(element)
    }

    return element
  }

  $: activeLanguage = languages.find((language) => language.code === currentLanguage) || languages[0]

  const changeLanguage = (language) => {

    if (!translations[language] || language === currentLanguage) return

    currentLanguage = language
    languageMenuOpen = false
    window.localStorage.setItem('language', language)
    routeKey += 1

    if (pathname === '/') {
      restartHomeIntro()
    }
  }

  $: if (menuOpen || languageMenuOpen) {
    controlsHidden = false
  }

  const loadRouteComponent = async (nextPathname) => {
    if (nextPathname === '/hello' && !ContactPageComponent) {
      ContactPageComponent = (await import('./lib/components/ContactPage.svelte')).default
    }

    if (nextPathname === '/insights' && !InsightsPageComponent) {
      InsightsPageComponent = (await import('./lib/components/InsightsPage.svelte')).default
    }

    if (nextPathname === '/scuba-life' && !ScubaPageComponent) {
      ScubaPageComponent = (await import('./lib/components/ScubaPage.svelte')).default
    }

    if ((nextPathname === '/404' || nextPathname === '/500' || !knownRoutes.includes(nextPathname)) && !ErrorPageComponent) {
      ErrorPageComponent = (await import('./lib/components/ErrorPage.svelte')).default
    }
  }

  const applySeo = () => {
    if (!descriptionMeta || !robotsMeta || !canonicalLink) return

    const canonicalPath = isErrorRoute && !routeSeo[pathname] ? '/404' : pathname
    const canonicalUrl = getAbsoluteUrl(canonicalPath)

    document.title = activeSeo.title
    descriptionMeta.content = activeSeo.description
    robotsMeta.content = activeSeo.robots
    canonicalLink.href = canonicalUrl
    ogTitleMeta.content = activeSeo.title
    ogDescriptionMeta.content = activeSeo.description
    ogUrlMeta.content = canonicalUrl
    ogSiteNameMeta.content = siteName
    ogTypeMeta.content = 'website'
    twitterCardMeta.content = 'summary'
    twitterTitleMeta.content = activeSeo.title
    twitterDescriptionMeta.content = activeSeo.description

    if (structuredDataScript) {
      if (pathname === '/' || pathname === '/hello') {
        structuredDataScript.textContent = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: 'Abraham Godong',
          url: getAbsoluteUrl('/'),
          jobTitle: 'Software Developer',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Seattle',
            addressRegion: 'WA',
            addressCountry: 'US',
          },
          knowsAbout: ['Software development', 'Artificial intelligence', 'Product thinking', 'Scuba diving'],
        })
      } else {
        structuredDataScript.textContent = ''
      }
    }
  }

  const resetRoute = (nextPathname) => {
    pathname = nextPathname
    routeKey += 1
    loadRouteComponent(nextPathname)

    if (nextPathname === '/') {
      restartHomeIntro()
    }

    if (nextPathname === '/hello') {
      contactSubmitted = false
      contactStatus = 'idle'
      contactError = ''
      contactForm = {
        ...contactForm,
        turnstileToken: '',
      }
    }

    if (nextPathname === '/404' || nextPathname === '/500' || !knownRoutes.includes(nextPathname)) {
      quoteIndex = Math.floor(Math.random() * errorQuotes.length)
      visibleQuoteIndex = quoteIndex
      quoteVisible = true
    }
  }

  const loadTurnstile = async () => {
    await loadContactConfig()

    if (!turnstileSiteKey) {
      return Promise.reject(new Error('Turnstile site key is not configured'))
    }

    if (window.turnstile) {
      return Promise.resolve(window.turnstile)
    }

    if (!turnstileLoadPromise) {
      turnstileLoadPromise = new Promise((resolve, reject) => {
        const existingScript = document.querySelector('script[data-turnstile-script]')

        if (existingScript) {
          existingScript.addEventListener('load', () => resolve(window.turnstile), { once: true })
          existingScript.addEventListener('error', reject, { once: true })
          return
        }

        const script = document.createElement('script')
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        script.async = true
        script.defer = true
        script.dataset.turnstileScript = 'true'
        script.addEventListener('load', () => resolve(window.turnstile), { once: true })
        script.addEventListener('error', reject, { once: true })
        document.head.appendChild(script)
      })
    }

    return turnstileLoadPromise
  }

  const getTurnstileToken = async () => {
    const turnstile = await loadTurnstile()
    const turnstileElement = document.getElementById('contact-turnstile')

    if (!turnstileElement) {
      throw new Error('Turnstile element is missing')
    }

    if (turnstileWidgetId === null) {
      turnstileWidgetId = turnstile.render(turnstileElement, {
        sitekey: turnstileSiteKey,
        size: 'invisible',
        callback: (token) => {
          contactForm = {
            ...contactForm,
            turnstileToken: token,
          }

          pendingTurnstileResolve?.(token)
          pendingTurnstileResolve = undefined
          pendingTurnstileReject = undefined
        },
        'expired-callback': () => {
          contactForm = {
            ...contactForm,
            turnstileToken: '',
          }
        },
        'error-callback': () => {
          pendingTurnstileReject?.(new Error('Turnstile verification failed'))
          pendingTurnstileResolve = undefined
          pendingTurnstileReject = undefined
        },
      })
    } else {
      turnstile.reset(turnstileWidgetId)
    }

    return new Promise((resolve, reject) => {
      const turnstileTimeout = window.setTimeout(() => {
        pendingTurnstileResolve = undefined
        pendingTurnstileReject = undefined
        reject(new Error('Turnstile verification timed out'))
      }, 10000)

      pendingTurnstileResolve = (token) => {
        window.clearTimeout(turnstileTimeout)
        resolve(token)
      }
      pendingTurnstileReject = (error) => {
        window.clearTimeout(turnstileTimeout)
        reject(error)
      }
      turnstile.execute(turnstileWidgetId)
    })
  }

  const loadContactIp = async () => {
    try {
      const response = await fetch('/api/contact/ip')

      if (!response.ok) {
        return
      }

      const payload = await response.json()
      contactForm = {
        ...contactForm,
        ipAddress: String(payload.ip || ''),
      }
    } catch (error) {
      contactForm = {
        ...contactForm,
        ipAddress: '',
      }
    }
  }

  const loadContactConfig = async () => {
    if (turnstileSiteKey) {
      return
    }

    try {
      const response = await fetch('/api/contact/config')

      if (!response.ok) {
        return
      }

      const payload = await response.json()
      turnstileSiteKey = String(payload.turnstileSiteKey || '')
    } catch (error) {
      turnstileSiteKey = ''
    }
  }

  onMount(() => {
    let letterTimer
    let nextLineTimer
    let startTimer
    let quoteTimer
    let quoteSwapTimer
    let lastScrollY = window.scrollY

    const clearIntroTimers = () => {
      window.clearTimeout(startTimer)
      window.clearTimeout(letterTimer)
      window.clearTimeout(nextLineTimer)
    }

    const updatePathname = () => {
      resetRoute(window.location.pathname)
    }

    const closeMenuOnEscape = (event) => {
      if (event.key === 'Escape') {
        menuOpen = false
        languageMenuOpen = false
      }
    }

    const closeLanguageMenu = (event) => {
      if (!event.target.closest('.language-control')) {
        languageMenuOpen = false
      }
    }

    const updateControlsVisibility = () => {
      const nextScrollY = window.scrollY
      const scrollDelta = nextScrollY - lastScrollY

      if (menuOpen || languageMenuOpen || nextScrollY < 24) {
        controlsHidden = false
        lastScrollY = nextScrollY
        return
      }

      if (scrollDelta > 8 && nextScrollY > 96) {
        controlsHidden = true
      } else if (scrollDelta < -8) {
        controlsHidden = false
      }

      lastScrollY = nextScrollY
    }

    const typeLine = (lineIndex, letterIndex = 0) => {
      activeLine = lineIndex
      typedLines[lineIndex] = lines[lineIndex].slice(0, letterIndex + 1)
      typedLines = typedLines

      if (letterIndex < lines[lineIndex].length - 1) {
        const typingDelay = lineIndex === 0 ? 38 : 10
        letterTimer = window.setTimeout(() => typeLine(lineIndex, letterIndex + 1), typingDelay)
        return
      }

      if (lineIndex < lines.length - 1) {
        nextLineTimer = window.setTimeout(() => typeLine(lineIndex + 1), 350)
      } else {
        paragraphDone = true
      }
    }

    const restartIntro = () => {
      clearIntroTimers()
      typedLines = ['', '']
      activeLine = 0
      paragraphDone = false
      startTimer = window.setTimeout(() => typeLine(0), 350)
    }

    restartHomeIntro = restartIntro

    robotsMeta = document.querySelector('meta[name="robots"]')
    descriptionMeta = ensureMeta('meta[name="description"]', { name: 'description' })
    ogTitleMeta = ensureMeta('meta[property="og:title"]', { property: 'og:title' })
    ogDescriptionMeta = ensureMeta('meta[property="og:description"]', { property: 'og:description' })
    ogUrlMeta = ensureMeta('meta[property="og:url"]', { property: 'og:url' })
    ogSiteNameMeta = ensureMeta('meta[property="og:site_name"]', { property: 'og:site_name' })
    ogTypeMeta = ensureMeta('meta[property="og:type"]', { property: 'og:type' })
    twitterCardMeta = ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card' })
    twitterTitleMeta = ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title' })
    twitterDescriptionMeta = ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description' })
    canonicalLink = ensureCanonical()
    structuredDataScript = document.head.querySelector('script[type="application/ld+json"]')

    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script')
      structuredDataScript.type = 'application/ld+json'
      document.head.appendChild(structuredDataScript)
    }

    if (!robotsMeta) {
      robotsMeta = document.createElement('meta')
      robotsMeta.name = 'robots'
      document.head.appendChild(robotsMeta)
    }

    const savedLanguage = window.localStorage.getItem('language')

    if (translations[savedLanguage]) {
      currentLanguage = savedLanguage
    }

    updatePathname()
    loadContactConfig()
    loadContactIp()
    window.addEventListener('popstate', updatePathname)
    window.addEventListener('keydown', closeMenuOnEscape)
    window.addEventListener('click', closeLanguageMenu)
    window.addEventListener('scroll', updateControlsVisibility, { passive: true })

    quoteTimer = window.setInterval(() => {
      quoteVisible = false
      quoteSwapTimer = window.setTimeout(() => {
        quoteIndex = (quoteIndex + 1) % errorQuotes.length
        visibleQuoteIndex = quoteIndex
        quoteVisible = true
      }, 650)
    }, 4600)

    return () => {
      clearIntroTimers()
      window.clearTimeout(quoteSwapTimer)
      window.clearInterval(quoteTimer)
      window.removeEventListener('popstate', updatePathname)
      window.removeEventListener('keydown', closeMenuOnEscape)
      window.removeEventListener('click', closeLanguageMenu)
      window.removeEventListener('scroll', updateControlsVisibility)
    }
  })

  const navigate = (event, href) => {
    event.preventDefault()
    menuOpen = false
    languageMenuOpen = false
    window.history.pushState({}, '', href)
    resetRoute(href)
    window.scrollTo({ top: 0 })
  }

  const submitContact = async () => {
    contactStatus = 'sending'
    contactError = ''

    try {
      const turnstileToken = await getTurnstileToken()

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: contactForm.name,
          email: contactForm.email,
          message: contactForm.message,
          company: contactForm.company,
          ipAddress: contactForm.ipAddress,
          turnstileToken,
        }),
      })

      if (!response.ok) {
        throw new Error('Contact request failed')
      }

      contactSubmitted = true
      contactStatus = 'idle'
      contactForm = {
        name: '',
        email: '',
        message: '',
        company: '',
        ipAddress: contactForm.ipAddress,
        turnstileToken: '',
      }
    } catch (error) {
      contactStatus = 'idle'
      contactError = t.contact.sendError
    }
  }
</script>

<main
  class={[
    'relative flex min-h-svh items-center justify-center overflow-hidden bg-[var(--color-background)] pl-6 text-[var(--color-text-primary)]',
    pathname === '/scuba-life' ? 'pr-6' : 'pr-[calc(var(--signature-size)+2rem)]',
    pathname === '/' ? 'home-background' : '',
  ]}
  style="--signature-size: clamp(2.5rem, 10svh, 7rem)"
>
  <div
    class={[
      'site-control site-control-left fixed left-6 top-5 z-30 flex items-center gap-5',
      controlsHidden ? 'site-control-hidden' : '',
    ]}
  >
    <button
      class="slide-link text-sm font-semibold uppercase tracking-widest"
      type="button"
      aria-haspopup="dialog"
      aria-expanded={menuOpen}
      on:click={() => (menuOpen = !menuOpen)}
    >
      {t.nav.menu}
    </button>
  </div>

  <LanguageMenu
    {t}
    {languages}
    {currentLanguage}
    {activeLanguage}
    {languageMenuOpen}
    {controlsHidden}
    onToggle={() => (languageMenuOpen = !languageMenuOpen)}
    onChangeLanguage={changeLanguage}
  />

  {#if pathname !== '/scuba-life'}
    <div
      class="pointer-events-none fixed right-0 top-1/2 z-[1] -translate-y-1/2 whitespace-nowrap text-[length:var(--signature-size)] font-semibold uppercase leading-none signature-mark [writing-mode:vertical-rl]"
      aria-hidden="true"
      data-signature="ABRAHAM GODONG"
    ></div>
  {/if}

  <SiteMenu
    {t}
    {menuOpen}
    {menuItems}
    onClose={() => (menuOpen = false)}
    onNavigate={navigate}
  />

  <div
    class={[
      'relative z-10 flex w-full justify-center transition duration-500 ease-out',
      menuOpen ? 'pointer-events-none blur-[3px]' : 'blur-0',
    ]}
    aria-hidden={menuOpen}
  >
  {#key routeKey}
  {#if pathname === '/hello'}
    {#if ContactPageComponent}
      <svelte:component
        this={ContactPageComponent}
        {t}
        bind:contactForm
        {contactSubmitted}
        {contactStatus}
        {contactError}
        {turnstileSiteKey}
        onSubmit={submitContact}
        onReset={() => {
          contactSubmitted = false
          contactError = ''
        }}
      />
    {/if}
  {:else if pathname === '/insights'}
    {#if InsightsPageComponent}
      <svelte:component this={InsightsPageComponent} {t} posts={insightPosts} />
    {/if}
  {:else if pathname === '/scuba-life'}
    {#if ScubaPageComponent}
      <svelte:component this={ScubaPageComponent} {t} />
    {/if}
  {:else if pathname === '/style-guide'}
    <div class="relative z-10 flex w-full max-w-5xl flex-col gap-12 pb-16 pt-24 md:pt-28">
      <a
        class="slide-link text-sm font-semibold uppercase tracking-widest"
        href="/"
        in:fade={{ duration: 450, delay: 50 }}
        on:click={(event) => navigate(event, '/')}
      >
        {t.nav.home}
      </a>

      <div in:fly={{ y: 28, duration: 650, delay: 120 }}>
        <PageHeader
          eyebrow="Private style guide"
          title="Calm systems, deep water."
          intro="A visual direction for a personal site about practical software, AI curiosity, product thinking, and scuba life."
        />
      </div>

      <div class="grid gap-10 lg:grid-cols-[0.8fr_1fr]">
        <section in:fly={{ y: 24, duration: 650, delay: 220 }}>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Text Colors
          </h2>
          <div class="mt-5 grid gap-4">
            <div class="border-l border-[#10201E] pl-4">
              <p class="text-2xl font-semibold text-[#10201E]">Primary text</p>
              <p class="mt-1 text-[var(--color-text-secondary)]">#10201E · deep green-black</p>
            </div>
            <div class="border-l border-[#5D6F6B] pl-4">
              <p class="text-2xl font-semibold text-[#5D6F6B]">Secondary text</p>
              <p class="mt-1 text-[var(--color-text-secondary)]">#5D6F6B · muted sea-gray</p>
            </div>
          </div>
        </section>

        <section in:fly={{ y: 24, duration: 650, delay: 300 }}>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Palette
          </h2>
          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <div class="bg-[#F8FAF7] p-5 text-[#10201E] ring-1 ring-[#D6E1DD]">
              Background · #F8FAF7
            </div>
            <div class="bg-[#EDF4F1] p-5 text-[#10201E]">Muted surface · #EDF4F1</div>
            <div class="bg-[#0D7C86] p-5 text-white">Accent · #0D7C86</div>
            <div class="bg-[#095E66] p-5 text-white">Accent hover · #095E66</div>
            <div class="bg-[#D6E1DD] p-5 text-[#10201E]">Soft border · #D6E1DD</div>
            <div class="bg-[#10201E] p-5 text-white">Watermark · #10201E at 10%</div>
          </div>
        </section>

        <section in:fly={{ y: 24, duration: 650, delay: 380 }}>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Typography
          </h2>
          <div class="mt-5 space-y-4">
            <p class="font-greeting text-5xl font-semibold italic leading-none text-[#10201E]">
              Cormorant Garamond Italic
            </p>
            <p class="text-lg leading-relaxed text-[#5D6F6B]">
              Use the display serif for expressive identity moments. Use Inter for body copy,
              forms, labels, and navigation.
            </p>
            <p class="text-sm font-semibold uppercase tracking-widest text-[#10201E]">
              Navigation uses uppercase labels with generous tracking.
            </p>
          </div>
        </section>

        <section in:fly={{ y: 24, duration: 650, delay: 460 }}>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Interface Rules
          </h2>
          <ul class="mt-5 grid gap-3 text-lg leading-relaxed text-[#5D6F6B]">
            <li>Use space and thin lines instead of heavy cards.</li>
            <li>Keep motion subtle: type, fade, rise, and slide.</li>
            <li>Let teal appear as an accent, not the whole palette.</li>
            <li>Use the vertical name as a quiet right-edge identity mark.</li>
            <li>Keep writing clear, direct, and grounded in real work.</li>
          </ul>
        </section>

        <section in:fly={{ y: 24, duration: 650, delay: 520 }}>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Pages
          </h2>
          <div class="mt-5 grid gap-4 text-lg leading-relaxed text-[#5D6F6B]">
            <p>
              <strong class="text-[#10201E]">Home:</strong> full-screen intro with typed copy,
              right-edge identity mark, and three primary paths.
            </p>
            <p>
              <strong class="text-[#10201E]">Contact:</strong> simple inquiry form with
              readable email and phone composed at runtime.
            </p>
            <p>
              <strong class="text-[#10201E]">Style guide:</strong> private internal reference,
              hidden from indexing.
            </p>
          </div>
        </section>

        <section in:fly={{ y: 24, duration: 650, delay: 580 }}>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Links & Buttons
          </h2>
          <div class="mt-5 grid gap-5">
            <a class="slide-link text-sm font-semibold uppercase tracking-widest" href="/style-guide">
              Sliding underline link
            </a>
            <button class="slide-link w-fit text-sm font-semibold uppercase tracking-widest" type="button">
              Text button
            </button>
            <p class="text-lg leading-relaxed text-[#5D6F6B]">
              Use text links and text buttons for navigation and low-friction actions. The
              underline slides on hover and focus; avoid filled buttons unless a future workflow
              needs stronger emphasis.
            </p>
          </div>
        </section>

        <section in:fly={{ y: 24, duration: 650, delay: 640 }}>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Forms
          </h2>
          <div class="mt-5 grid gap-4">
            <label class="grid gap-2">
              <span class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
                Field label
              </span>
              <input
                class="border-b border-[#D6E1DD] bg-transparent py-3 text-lg text-[#10201E] outline-none transition-colors focus:border-[#10201E]"
                value="Single-line input"
                readonly
              />
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
                Message
              </span>
              <textarea
                class="min-h-28 resize-y border-b border-[#D6E1DD] bg-transparent py-3 text-lg leading-relaxed text-[#10201E] outline-none transition-colors focus:border-[#10201E]"
                readonly
              >Textarea input</textarea>
            </label>
            <p class="text-lg leading-relaxed text-[#5D6F6B]">
              Forms use bottom borders only, transparent backgrounds, required fields, browser
              validation, and a right-aligned submit action.
            </p>
          </div>
        </section>

        <section in:fly={{ y: 24, duration: 650, delay: 700 }}>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Contact Details
          </h2>
          <dl class="mt-5 grid gap-4 text-sm uppercase tracking-widest text-[var(--color-text-secondary)]">
            <div>
              <dt class="font-semibold text-[#10201E]">Email</dt>
              <dd class="mt-1 normal-case tracking-normal text-[#5D6F6B]">
                Display the real address, composed from parts at runtime, without a mailto link.
              </dd>
            </div>
            <div>
              <dt class="font-semibold text-[#10201E]">Phone</dt>
              <dd class="mt-1 normal-case tracking-normal text-[#5D6F6B]">
                Display the real number, composed from parts at runtime, without a tel link.
              </dd>
            </div>
          </dl>
        </section>

        <section in:fly={{ y: 24, duration: 650, delay: 760 }}>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Signature
          </h2>
          <p class="mt-5 text-lg leading-relaxed text-[#5D6F6B]">
            The name mark is all caps, vertical on the right edge, black at 10% opacity,
            centered vertically, and placed behind page content. Reserve a right-side lane so
            content never covers it.
          </p>
        </section>

        <section in:fly={{ y: 24, duration: 650, delay: 820 }}>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Motion
          </h2>
          <ul class="mt-5 grid gap-3 text-lg leading-relaxed text-[#5D6F6B]">
            <li>Home intro types one letter at a time.</li>
            <li>Contact page elements fade or rise in with staggered timing.</li>
            <li>Links use sliding underlines on hover and focus.</li>
            <li>Motion should clarify attention, never become the main event.</li>
          </ul>
        </section>

        <section in:fly={{ y: 24, duration: 650, delay: 880 }}>
          <h2 class="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Responsive & Access
          </h2>
          <ul class="mt-5 grid gap-3 text-lg leading-relaxed text-[#5D6F6B]">
            <li>Use fluid viewport-based sizing only for the vertical signature.</li>
            <li>Keep content in a max-width column with enough right padding for the signature.</li>
            <li>Use semantic headings, labels, form controls, and nav landmarks.</li>
            <li>Keep focus styles visible through underline animation and input border changes.</li>
            <li>Keep the private style guide hidden with robots meta and robots.txt.</li>
          </ul>
        </section>
      </div>
    </div>
  {:else if isErrorRoute}
    {#if ErrorPageComponent}
      <svelte:component
        this={ErrorPageComponent}
        {t}
        {errorStatus}
        {errorTitle}
        {currentQuote}
        {quoteVisible}
        onNavigate={navigate}
      />
    {/if}
  {:else}
    <HomePage
      {t}
      {lines}
      {typedLines}
      {activeLine}
      {paragraphDone}
      onNavigate={navigate}
    />
  {/if}
  {/key}
  </div>
</main>
