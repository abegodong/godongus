<script>
  import { onMount } from 'svelte'
  import 'leaflet/dist/leaflet.css'
  import PageHeader from './PageHeader.svelte'

  export let t
  export let fullSize = false
  export let onNavigate = undefined

  const sunnysideBeach = [47.1787087, -122.5898493]
  const noaaChartExportUrl =
    'https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/exts/MaritimeChartService/MapServer/export'
  const dnrBathymetryExportUrl =
    'https://gis.dnr.wa.gov/image/rest/services/Aquatics/WA_bathymetry_CoNED_MLLW/ImageServer/exportImage'
  const dnrBathymetrySamplesUrl =
    'https://gis.dnr.wa.gov/image/rest/services/Aquatics/WA_bathymetry_CoNED_MLLW/ImageServer/getSamples'
  const dnrBathymetryRenderingRule = JSON.stringify({ rasterFunction: 'bathy_top50m' })
  const tileSize = 256
  const earthRadius = 6378137
  const originShift = Math.PI * earthRadius
  const depthTraceSamples = [
    { lat: 47.1781326, lng: -122.5905681, depthMeters: 0.8 },
    { lat: 47.1781326, lng: -122.5915123, depthMeters: 6.4 },
    { lat: 47.1784826, lng: -122.5922418, depthMeters: 13 },
    { lat: 47.1789348, lng: -122.5929285, depthMeters: 18.5 },
    { lat: 47.1792556, lng: -122.5935078, depthMeters: 23.2 },
    { lat: 47.1796057, lng: -122.5940014, depthMeters: 27.1 },
    { lat: 47.1797953, lng: -122.5944091, depthMeters: 29.6 },
  ]
  const labeledDepthSampleIndexes = new Set([0, 1, 3, 5, 6])
  const deadReckoningPoisEndpoint = '/api/dead-reckoning-pois'

  let mapElement
  let map
  let mapReady = false

  const tileBoundsToWebMercatorBbox = ({ x, y, z }) => {
    const resolution = (2 * Math.PI * earthRadius) / (tileSize * 2 ** z)
    const minX = x * tileSize * resolution - originShift
    const maxX = (x + 1) * tileSize * resolution - originShift
    const maxY = originShift - y * tileSize * resolution
    const minY = originShift - (y + 1) * tileSize * resolution

    return [minX, minY, maxX, maxY].join(',')
  }

  const formatDepth = (depthMeters) => {
    if (depthMeters <= 0.5) return 'shore'

    return `${Math.round(depthMeters)} m / ${Math.round(depthMeters * 3.28084)} ft`
  }

  const getTraceColor = (depthMeters) => {
    if (depthMeters < 10) return '#14b8a6'
    if (depthMeters < 20) return '#0d7c86'
    if (depthMeters < 28) return '#2563eb'
    return '#1e3a8a'
  }

  const formatCoordinate = ({ lat, lng }) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`

  const parseCsv = (csv) => {
    const rows = []
    let row = []
    let value = ''
    let insideQuotes = false

    for (let index = 0; index < csv.length; index += 1) {
      const character = csv[index]
      const nextCharacter = csv[index + 1]

      if (character === '"') {
        if (insideQuotes && nextCharacter === '"') {
          value += '"'
          index += 1
        } else {
          insideQuotes = !insideQuotes
        }
      } else if (character === ',' && !insideQuotes) {
        row.push(value.trim())
        value = ''
      } else if ((character === '\n' || character === '\r') && !insideQuotes) {
        if (character === '\r' && nextCharacter === '\n') {
          index += 1
        }

        row.push(value.trim())
        if (row.some((cell) => cell.length > 0)) {
          rows.push(row)
        }
        row = []
        value = ''
      } else {
        value += character
      }
    }

    row.push(value.trim())
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row)
    }

    return rows
  }

  const parseCoordinate = (coordinate) => {
    const [latValue, lngValue] = coordinate.split(',').map((part) => Number(part.trim()))

    if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) {
      return null
    }

    return { lat: latValue, lng: lngValue }
  }

  const parseOptionalNumber = (value) => {
    const parsed = Number(String(value || '').trim())

    return Number.isFinite(parsed) ? parsed : null
  }

  const loadDeadReckoningPois = async () => {
    const response = await fetch(deadReckoningPoisEndpoint, { cache: 'no-store' })

    if (!response.ok) {
      throw new Error('Dead Reckoning POI sheet request failed')
    }

    const rows = parseCsv(await response.text())

    return rows
      .slice(1)
      .map((row) => {
        const coordinate = parseCoordinate(row[10] || '')

        if (!coordinate || !row[1]) {
          return null
        }

        return {
          id: row[0] || '',
          name: row[1],
          fromPoint: row[2] || '',
          bearing: parseOptionalNumber(row[3]),
          kickCycles: parseOptionalNumber(row[4]),
          distanceMeters: parseOptionalNumber(row[5]),
          sheetDepthFeet: parseOptionalNumber(row[8]),
          notes: row[9] || '',
          lat: coordinate.lat,
          lng: coordinate.lng,
        }
      })
      .filter(Boolean)
  }

  const formatSheetDepth = (depthFeet) => {
    if (!Number.isFinite(depthFeet)) {
      return t.diveMap.depthUnavailable
    }

    return `${depthFeet} ft / ${Math.round(depthFeet / 3.28084)} m`
  }

  const formatDepthComparison = (sheetDepthFeet, dnrDepthMeters) => {
    if (!Number.isFinite(sheetDepthFeet) || !Number.isFinite(dnrDepthMeters)) {
      return t.diveMap.depthUnavailable
    }

    const dnrDepthFeet = dnrDepthMeters * 3.28084
    const difference = Math.round(dnrDepthFeet - sheetDepthFeet)

    if (Math.abs(difference) < 1) {
      return 'Sheet and DNR are within 1 ft'
    }

    return `DNR is ${Math.abs(difference)} ft ${difference > 0 ? 'deeper' : 'shallower'}`
  }

  const latLngToWebMercator = ({ lat, lng }) => {
    const boundedLat = Math.max(Math.min(lat, 85.05112878), -85.05112878)

    return {
      x: earthRadius * (lng * Math.PI / 180),
      y: earthRadius * Math.log(Math.tan(Math.PI / 4 + (boundedLat * Math.PI / 180) / 2)),
    }
  }

  const getDepthAtLatLng = async (latlng) => {
    const point = latLngToWebMercator(latlng)
    const params = new URLSearchParams({
      geometry: JSON.stringify({
        x: point.x,
        y: point.y,
        spatialReference: { wkid: 3857 },
      }),
      geometryType: 'esriGeometryPoint',
      sampleDistance: '10',
      returnFirstValueOnly: 'false',
      f: 'json',
    })
    const response = await fetch(`${dnrBathymetrySamplesUrl}?${params.toString()}`)

    if (!response.ok) {
      throw new Error('Depth sample request failed')
    }

    const payload = await response.json()
    const value = Number(payload?.samples?.[0]?.value)

    if (!Number.isFinite(value)) {
      return null
    }

    return Math.max(0, Math.abs(value))
  }

  const getGpsPopupContent = (coordinate, depthContent) => `
    <div class="gps-coordinate-popup-content">
      <span>${t.diveMap.gpsCoordinate}</span>
      <strong>${coordinate}</strong>
      <span>${t.diveMap.depth}</span>
      <strong>${depthContent}</strong>
    </div>
  `

  const getDeadReckoningPoiPopupContent = (poi, dnrDepthMeters = undefined) => {
    const dnrDepth =
      dnrDepthMeters === undefined
        ? t.diveMap.depthLoading
        : dnrDepthMeters === null
          ? t.diveMap.depthUnavailable
          : formatDepth(dnrDepthMeters)
    const sheetDepth = formatSheetDepth(poi.sheetDepthFeet)
    const comparison =
      dnrDepthMeters === undefined ? t.diveMap.depthLoading : formatDepthComparison(poi.sheetDepthFeet, dnrDepthMeters)

    return `
      <div class="dead-reckoning-poi-popup-content">
        <strong>${poi.name}</strong>
        <dl>
          <div>
            <dt>${t.diveMap.gpsCoordinate}</dt>
            <dd>${formatCoordinate(poi)}</dd>
          </div>
          <div>
            <dt>${t.diveMap.dnrDepth}</dt>
            <dd>${dnrDepth}</dd>
          </div>
          <div>
            <dt>${t.diveMap.sheetDepth}</dt>
            <dd>${sheetDepth}</dd>
          </div>
          <div>
            <dt>${t.diveMap.depthComparison}</dt>
            <dd>${comparison}</dd>
          </div>
          ${
            poi.fromPoint
              ? `<div>
                  <dt>${t.diveMap.fromPoint}</dt>
                  <dd>${poi.fromPoint}</dd>
                </div>`
              : ''
          }
          ${
            Number.isFinite(poi.distanceMeters)
              ? `<div>
                  <dt>${t.diveMap.distance}</dt>
                  <dd>${poi.distanceMeters} m / ${Math.round(poi.distanceMeters * 3.28084)} ft</dd>
                </div>`
              : ''
          }
          ${
            Number.isFinite(poi.kickCycles)
              ? `<div>
                  <dt>${t.diveMap.kickCycles}</dt>
                  <dd>${poi.kickCycles}</dd>
                </div>`
              : ''
          }
          ${
            poi.notes
              ? `<div>
                  <dt>${t.diveMap.notes}</dt>
                  <dd>${poi.notes}</dd>
                </div>`
              : ''
          }
        </dl>
      </div>
    `
  }

  const createNoaaChartLayer = (L) =>
    L.GridLayer.extend({
      createTile(coords, done) {
        const tile = document.createElement('img')
        const params = new URLSearchParams({
          bbox: tileBoundsToWebMercatorBbox(coords),
          bboxSR: '3857',
          imageSR: '3857',
          size: `${tileSize},${tileSize}`,
          format: 'png32',
          transparent: 'true',
          layers: 'show:2,3',
          f: 'image',
        })

        tile.alt = ''
        tile.decoding = 'async'
        tile.width = tileSize
        tile.height = tileSize
        tile.onload = () => done(null, tile)
        tile.onerror = () => done(new Error('NOAA chart tile failed to load'), tile)
        tile.src = `${noaaChartExportUrl}?${params.toString()}`

        return tile
      },
    })

  const createDnrBathymetryLayer = (L) =>
    L.GridLayer.extend({
      createTile(coords, done) {
        const tile = document.createElement('img')
        const params = new URLSearchParams({
          bbox: tileBoundsToWebMercatorBbox(coords),
          bboxSR: '3857',
          imageSR: '3857',
          size: `${tileSize},${tileSize}`,
          format: 'png32',
          transparent: 'true',
          renderingRule: dnrBathymetryRenderingRule,
          f: 'image',
        })

        tile.alt = ''
        tile.decoding = 'async'
        tile.width = tileSize
        tile.height = tileSize
        tile.onload = () => done(null, tile)
        tile.onerror = () => done(new Error('DNR bathymetry tile failed to load'), tile)
        tile.src = `${dnrBathymetryExportUrl}?${params.toString()}`

        return tile
      },
    })

  const createRecenterControl = (L) =>
    L.Control.extend({
      onAdd(currentMap) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control sunnyside-recenter-control')
        const button = L.DomUtil.create('button', 'sunnyside-recenter-button', container)

        button.type = 'button'
        button.title = t.diveMap.recenter
        button.setAttribute('aria-label', t.diveMap.recenter)
        button.innerHTML = '<span aria-hidden="true">⌖</span>'

        L.DomEvent.disableClickPropagation(container)
        L.DomEvent.disableScrollPropagation(container)
        L.DomEvent.on(button, 'click', (event) => {
          L.DomEvent.stop(event)
          currentMap.flyTo(sunnysideBeach, 16, {
            animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            duration: 0.75,
          })
        })

        return container
      },
    })

  const createDepthTraceLayer = (L) => {
    const traceLayer = L.layerGroup()
    const traceLatLngs = depthTraceSamples.map((sample) => [sample.lat, sample.lng])

    L.polyline(traceLatLngs, {
      color: '#10201e',
      weight: 8,
      opacity: 0.62,
      dashArray: '7 9',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(traceLayer)

    depthTraceSamples.slice(1).forEach((sample, index) => {
      const previousSample = depthTraceSamples[index]
      const averageDepth = (previousSample.depthMeters + sample.depthMeters) / 2

      L.polyline(
        [
          [previousSample.lat, previousSample.lng],
          [sample.lat, sample.lng],
        ],
        {
          color: getTraceColor(averageDepth),
          weight: 4,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }
      ).addTo(traceLayer)
    })

    depthTraceSamples.forEach((sample, index) => {
      const marker = L.circleMarker([sample.lat, sample.lng], {
        radius: labeledDepthSampleIndexes.has(index) ? 5 : 3,
        weight: 2,
        color: '#10201e',
        fillColor: getTraceColor(sample.depthMeters),
        fillOpacity: 0.95,
      }).addTo(traceLayer)

      if (labeledDepthSampleIndexes.has(index)) {
        marker.bindTooltip(formatDepth(sample.depthMeters), {
          permanent: true,
          direction: 'top',
          offset: [0, -4],
          className: 'depth-trace-label',
        })
      } else {
        marker.bindTooltip(formatDepth(sample.depthMeters), {
          direction: 'top',
          offset: [0, -4],
          className: 'depth-trace-label',
        })
      }
    })

    return traceLayer
  }

  const createDeadReckoningPoisLayer = (L) => {
    const poisLayer = L.layerGroup()

    loadDeadReckoningPois()
      .then((pois) => {
        pois.forEach((poi) => {
          const marker = L.circleMarker([poi.lat, poi.lng], {
            radius: 6,
            weight: 2,
            color: '#10201e',
            fillColor: '#f6c85f',
            fillOpacity: 0.95,
            bubblingMouseEvents: false,
            className: 'dead-reckoning-poi-marker',
          })
            .addTo(poisLayer)
            .bindPopup(getDeadReckoningPoiPopupContent(poi), {
              className: 'dead-reckoning-poi-popup',
            })
            .bindTooltip(poi.name, {
              direction: 'top',
              offset: [0, -4],
              className: 'dead-reckoning-poi-label',
            })

          marker.on('popupopen', (event) => {
            getDepthAtLatLng(poi)
              .then((depthMeters) => {
                event.popup.setContent(getDeadReckoningPoiPopupContent(poi, depthMeters))
              })
              .catch(() => {
                event.popup.setContent(getDeadReckoningPoiPopupContent(poi, null))
              })
          })
        })
      })
      .catch(() => {
        L.popup({
          closeButton: true,
          className: 'dead-reckoning-poi-popup',
        })
          .setLatLng(sunnysideBeach)
          .setContent(`<div class="dead-reckoning-poi-popup-content"><strong>${t.diveMap.poisUnavailable}</strong></div>`)
          .addTo(poisLayer)
      })

    return poisLayer
  }

  onMount(() => {
    let cancelled = false

    const initializeMap = async () => {
      const L = await import('leaflet')

      if (!mapElement || cancelled) return

      const NoaaChartLayer = createNoaaChartLayer(L)
      const DnrBathymetryLayer = createDnrBathymetryLayer(L)
      const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxNativeZoom: 19,
        maxZoom: 24,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      })
      const noaaLayer = new NoaaChartLayer({
        tileSize,
        opacity: 0.72,
        attribution: 'NOAA Office of Coast Survey',
      })
      const dnrBathymetryLayer = new DnrBathymetryLayer({
        tileSize,
        opacity: 0.62,
        className: 'dnr-bathymetry-tile',
        attribution: 'WA DNR / USGS CoNED',
      })
      const depthTraceLayer = createDepthTraceLayer(L)
      const deadReckoningPoisLayer = createDeadReckoningPoisLayer(L)
      const layerControlCollapsed = window.matchMedia('(max-width: 720px)').matches

      map = L.map(mapElement, {
        center: sunnysideBeach,
        zoom: 18,
        minZoom: 11,
        maxZoom: 24,
        layers: [osmLayer, dnrBathymetryLayer, depthTraceLayer, deadReckoningPoisLayer],
        scrollWheelZoom: true,
        zoomControl: !fullSize,
      })

      map.on('click', (event) => {
        const coordinate = formatCoordinate(event.latlng)
        const popup = L.popup({
          closeButton: true,
          className: 'gps-coordinate-popup',
        })
          .setLatLng(event.latlng)
          .setContent(getGpsPopupContent(coordinate, t.diveMap.depthLoading))
          .openOn(map)

        getDepthAtLatLng(event.latlng)
          .then((depthMeters) => {
            const depthContent = depthMeters === null ? t.diveMap.depthUnavailable : formatDepth(depthMeters)

            if (map.hasLayer(popup)) {
              popup.setContent(getGpsPopupContent(coordinate, depthContent))
            }
          })
          .catch(() => {
            if (map.hasLayer(popup)) {
              popup.setContent(getGpsPopupContent(coordinate, t.diveMap.depthUnavailable))
            }
          })
      })

      if (fullSize) {
        L.control.zoom({ position: 'bottomleft' }).addTo(map)
      }

      const RecenterControl = createRecenterControl(L)
      new RecenterControl({ position: fullSize ? 'bottomleft' : 'topleft' }).addTo(map)

      L.circleMarker(sunnysideBeach, {
        radius: 7,
        weight: 2,
        color: '#10201e',
        fillColor: '#0d7c86',
        fillOpacity: 0.86,
      })
        .addTo(map)
        .bindPopup(t.diveMap.marker)

      L.control
        .layers(
          { OpenStreetMap: osmLayer },
          {
            [t.diveMap.depthLayer]: dnrBathymetryLayer,
            [t.diveMap.depthTrace]: depthTraceLayer,
            [t.diveMap.deadReckoningPois]: deadReckoningPoisLayer,
            [t.diveMap.noaaLayer]: noaaLayer,
          },
          {
            collapsed: layerControlCollapsed,
            position: fullSize ? 'bottomright' : 'topright',
          }
        )
        .addTo(map)

      map.whenReady(() => {
        mapReady = true
        window.setTimeout(() => map?.invalidateSize(), 120)
      })
    }

    initializeMap()

    return () => {
      cancelled = true
      map?.remove()
      map = undefined
    }
  })
</script>

{#if fullSize}
  <section class="sunnyside-full-map" aria-label={t.diveMap.mapLabel}>
    <div class="sunnyside-full-map-panel">
      <div>
        <p class="text-[0.68rem] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
          {t.diveMap.eyebrow}
        </p>
        <h1 class="font-greeting mt-1 text-3xl font-semibold italic leading-none text-[var(--color-text-primary)]">
          {t.diveMap.title}
        </h1>
        <p class="mt-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
          {t.diveMap.depthTraceSummary}
        </p>
      </div>

      <a
        class="slide-link w-fit text-xs font-semibold uppercase tracking-widest"
        href="/sunnyside-dive-map"
        on:click={(event) => onNavigate?.(event, '/sunnyside-dive-map')}
      >
        {t.diveMap.backToMapPage}
      </a>
    </div>

    <div class="sunnyside-map-shell sunnyside-map-shell-full">
      {#if !mapReady}
        <div class="sunnyside-map-loading" aria-hidden="true">
          <span>{t.diveMap.loading}</span>
        </div>
      {/if}
      <div bind:this={mapElement} class="sunnyside-map" role="application" aria-label={t.diveMap.mapLabel}></div>
    </div>
  </section>
{:else}
  <div class="reveal-page relative z-10 flex w-[calc(100vw-1.5rem)] max-w-6xl flex-col gap-8 pb-12 pt-24 sm:w-full md:gap-10 md:pb-16 md:pt-28">
    <PageHeader
      eyebrow={t.diveMap.eyebrow}
      title={t.diveMap.title}
      intro={t.diveMap.intro}
    />

    <section
      class="grid gap-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[0_22px_70px_rgb(16_32_30/0.08)] sm:p-5"
      data-reveal
      style="--reveal-index: 1"
      aria-label={t.diveMap.mapLabel}
    >
      <div class="grid gap-5 px-1 lg:grid-cols-[0.8fr_1fr] lg:items-start">
        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            {t.diveMap.locationLabel}
          </p>
          <p class="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
            {t.diveMap.location}
          </p>
        </div>

        <div class="flex max-w-xl flex-col items-start gap-4 lg:justify-self-end">
          <p class="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {t.diveMap.layerNote}
          </p>
          <a
            class="slide-link text-sm font-semibold uppercase tracking-widest"
            href="/sunnyside-dive-map/full"
            on:click={(event) => onNavigate?.(event, '/sunnyside-dive-map/full')}
          >
            {t.diveMap.openFullMap}
          </a>
        </div>
      </div>

      <div class="sunnyside-map-shell">
        {#if !mapReady}
          <div class="sunnyside-map-loading" aria-hidden="true">
            <span>{t.diveMap.loading}</span>
          </div>
        {/if}
        <div bind:this={mapElement} class="sunnyside-map" role="application" aria-label={t.diveMap.mapLabel}></div>
      </div>
    </section>
  </div>
{/if}

<style>
  .sunnyside-full-map {
    position: relative;
    width: 100%;
    min-height: 100svh;
    background: var(--color-background);
  }

  .sunnyside-full-map-panel {
    position: fixed;
    left: 1.5rem;
    top: 4.5rem;
    z-index: 500;
    display: grid;
    gap: 1rem;
    max-width: min(24rem, calc(100vw - 3rem));
    border: 1px solid rgb(16 32 30 / 0.16);
    background: rgb(248 250 247 / 0.84);
    padding: 1rem;
    box-shadow: 0 18px 50px rgb(16 32 30 / 0.12);
    backdrop-filter: blur(14px);
  }

  .sunnyside-map-shell {
    position: relative;
    min-height: clamp(28rem, 68svh, 44rem);
    overflow: hidden;
    border: 1px solid var(--color-border);
    background: rgb(16 32 30 / 0.08);
  }

  .sunnyside-map-shell-full,
  .sunnyside-map-shell-full .sunnyside-map {
    min-height: 100svh;
    height: 100svh;
    border: 0;
  }

  .sunnyside-map {
    min-height: clamp(28rem, 68svh, 44rem);
    width: 100%;
    opacity: 0;
    animation: map-reveal 800ms ease-out 180ms forwards;
  }

  .sunnyside-map-loading {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    place-items: center;
    background:
      linear-gradient(120deg, rgb(237 244 241 / 0.92), rgb(248 250 247 / 0.78)),
      var(--color-surface);
    color: var(--color-text-secondary);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    transition: opacity 500ms ease;
    pointer-events: none;
  }

  .sunnyside-map:global(.leaflet-container) {
    background: rgb(237 244 241);
    color: var(--color-text-primary);
    font-family: inherit;
  }

  .sunnyside-map :global(.dnr-bathymetry-tile) {
    mix-blend-mode: multiply;
    filter: saturate(1.12) contrast(1.08);
  }

  .sunnyside-map :global(.leaflet-control-layers),
  .sunnyside-map :global(.leaflet-control-zoom a),
  .sunnyside-map :global(.sunnyside-recenter-button),
  .sunnyside-map :global(.leaflet-popup-content-wrapper),
  .sunnyside-map :global(.leaflet-popup-tip) {
    border-radius: 0;
  }

  .sunnyside-map :global(.leaflet-control-layers) {
    border: 1px solid rgb(16 32 30 / 0.18);
    background: rgb(248 250 247 / 0.86);
    box-shadow: 0 12px 36px rgb(16 32 30 / 0.12);
    backdrop-filter: blur(12px);
    color: var(--color-text-primary);
    font-size: 0.84rem;
  }

  .sunnyside-map :global(.leaflet-control-layers-toggle),
  .sunnyside-map :global(.leaflet-touch .leaflet-control-layers-toggle) {
    width: 2.75rem;
    height: 2.75rem;
  }

  .sunnyside-map :global(.leaflet-touch .leaflet-bar a) {
    width: 2.75rem;
    height: 2.75rem;
    line-height: 2.75rem;
  }

  .sunnyside-map :global(.sunnyside-recenter-control) {
    overflow: hidden;
  }

  .sunnyside-map :global(.sunnyside-recenter-button) {
    display: grid;
    width: 2.125rem;
    height: 2.125rem;
    place-items: center;
    border: 0;
    border-bottom: 1px solid #ccc;
    background: #fff;
    color: #10201e;
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
  }

  .sunnyside-map :global(.sunnyside-recenter-button:hover),
  .sunnyside-map :global(.sunnyside-recenter-button:focus-visible) {
    background: #f4f4f4;
    color: var(--color-accent-hover);
    outline: none;
  }

  .sunnyside-map :global(.leaflet-touch .sunnyside-recenter-button) {
    width: 2.75rem;
    height: 2.75rem;
    font-size: 1.45rem;
  }

  .sunnyside-map :global(.leaflet-control-attribution) {
    background: rgb(248 250 247 / 0.82);
    color: var(--color-text-secondary);
    font-size: 0.68rem;
  }

  .sunnyside-map :global(.leaflet-control-attribution a) {
    color: var(--color-accent-hover);
  }

  .sunnyside-map :global(.leaflet-popup-content) {
    margin: 0.85rem 1rem;
    color: var(--color-text-primary);
    font-weight: 700;
  }

  .sunnyside-map :global(.gps-coordinate-popup .leaflet-popup-content) {
    margin: 0;
  }

  .sunnyside-map :global(.gps-coordinate-popup-content) {
    display: grid;
    gap: 0.28rem;
    min-width: 12rem;
    padding: 0.85rem 1rem;
  }

  .sunnyside-map :global(.gps-coordinate-popup-content span) {
    color: var(--color-text-secondary);
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .sunnyside-map :global(.gps-coordinate-popup-content strong) {
    color: var(--color-text-primary);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    font-size: 0.92rem;
    font-weight: 800;
    letter-spacing: 0;
  }

  .sunnyside-map :global(.depth-trace-label) {
    border: 1px solid rgb(16 32 30 / 0.2);
    background: rgb(248 250 247 / 0.9);
    box-shadow: 0 8px 22px rgb(16 32 30 / 0.12);
    color: var(--color-text-primary);
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .sunnyside-map :global(.depth-trace-label::before) {
    border-top-color: rgb(248 250 247 / 0.9);
  }

  .sunnyside-map :global(.dead-reckoning-poi-label) {
    border: 1px solid rgb(16 32 30 / 0.14);
    background: rgb(248 250 247 / 0.88);
    box-shadow: 0 8px 22px rgb(16 32 30 / 0.1);
    color: var(--color-text-primary);
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.04em;
  }

  .sunnyside-map :global(.dead-reckoning-poi-label::before) {
    border-top-color: rgb(248 250 247 / 0.88);
  }

  .sunnyside-map :global(.dead-reckoning-poi-popup .leaflet-popup-content) {
    margin: 0;
  }

  .sunnyside-map :global(.dead-reckoning-poi-popup-content) {
    display: grid;
    gap: 0.65rem;
    min-width: 14rem;
    padding: 0.9rem 1rem;
  }

  .sunnyside-map :global(.dead-reckoning-poi-popup-content > strong) {
    color: var(--color-text-primary);
    font-size: 1rem;
  }

  .sunnyside-map :global(.dead-reckoning-poi-popup-content dl) {
    display: grid;
    gap: 0.42rem;
    margin: 0;
  }

  .sunnyside-map :global(.dead-reckoning-poi-popup-content div) {
    display: grid;
    gap: 0.08rem;
  }

  .sunnyside-map :global(.dead-reckoning-poi-popup-content dt) {
    color: var(--color-text-secondary);
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .sunnyside-map :global(.dead-reckoning-poi-popup-content dd) {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 0.86rem;
    font-weight: 700;
  }

  @keyframes map-reveal {
    from {
      opacity: 0;
      transform: translateY(0.75rem);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sunnyside-map {
      animation: none;
      opacity: 1;
    }
  }

  @media (max-width: 720px) {
    .sunnyside-full-map-panel {
      top: 4rem;
      right: 0.75rem;
      left: 0.75rem;
      max-width: none;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: end;
      gap: 0.75rem;
      padding: 0.78rem 0.85rem;
    }

    .sunnyside-full-map-panel h1 {
      font-size: clamp(1.55rem, 8vw, 2.25rem);
    }

    .sunnyside-map-shell {
      min-height: min(74svh, 38rem);
    }

    .sunnyside-map {
      min-height: min(74svh, 38rem);
    }

    .sunnyside-map-shell-full,
    .sunnyside-map-shell-full .sunnyside-map {
      min-height: 100svh;
      height: 100svh;
    }

    .sunnyside-map :global(.leaflet-control-layers-expanded) {
      max-width: min(15rem, calc(100vw - 2.5rem));
    }

    .sunnyside-map :global(.leaflet-top.leaflet-right) {
      top: 4.65rem;
    }

    .sunnyside-full-map .sunnyside-map :global(.leaflet-bottom.leaflet-left),
    .sunnyside-full-map .sunnyside-map :global(.leaflet-bottom.leaflet-right) {
      bottom: 2.2rem;
    }

    .sunnyside-map :global(.leaflet-bottom.leaflet-right),
    .sunnyside-map :global(.leaflet-bottom.leaflet-left) {
      max-width: calc(100vw - 1.5rem);
    }

    .sunnyside-map :global(.leaflet-control-attribution) {
      font-size: 0.62rem;
      line-height: 1.35;
    }
  }
</style>
