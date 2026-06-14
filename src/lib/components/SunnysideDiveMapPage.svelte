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
  const dnrBathymetrySamplesUrl =
    'https://gis.dnr.wa.gov/image/rest/services/Aquatics/WA_bathymetry_CoNED_MLLW/ImageServer/getSamples'
  const tileSize = 256
  const earthRadius = 6378137
  const originShift = Math.PI * earthRadius
  const deadReckoningPoisEndpoint = '/api/sunnyside/pois'
  const deadReckoningPoisFallbackEndpoint = '/data/sunnyside-pois.json'
  const dnrBathymetryTileUrl = '/data/sunnyside-dnr-tiles/{z}/{x}/{y}.png'
  const depthContoursEndpoint = '/data/sunnyside-depth-contours.json'
  const pipelineLabelReference = { lat: 47.1789348, lng: -122.5929285 }
  const contourLabelReferences = {
    40: { lat: 47.1782797, lng: -122.5922156 },
  }

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

    return `${Math.round(depthMeters * 3.28084)} ft / ${Math.round(depthMeters)} m`
  }

  const formatElevation = (elevationMeters) => `${Math.round(elevationMeters * 3.28084)} ft / ${Math.round(elevationMeters)} m`

  const formatCoordinate = ({ lat, lng }) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`

  const loadDeadReckoningPois = async () => {
    let response = await fetch(deadReckoningPoisEndpoint, { cache: 'no-store' })

    if (!response.ok) {
      response = await fetch(deadReckoningPoisFallbackEndpoint, { cache: 'force-cache' })
    }

    if (!response.ok) {
      throw new Error('Dead Reckoning POI data request failed')
    }

    const dataset = await response.json()

    return dataset.pois || []
  }

  const loadDepthContours = async () => {
    const response = await fetch(depthContoursEndpoint, { cache: 'force-cache' })

    if (!response.ok) {
      throw new Error('Depth contour data request failed')
    }

    return response.json()
  }

  const getDepthDifferenceFeet = (sheetDepthFeet, dnrDepthMeters) => {
    if (!Number.isFinite(sheetDepthFeet) || !Number.isFinite(dnrDepthMeters)) {
      return null
    }

    return Math.abs(dnrDepthMeters * 3.28084 - sheetDepthFeet)
  }

  const getDepthMatchColor = (differenceFeet) => {
    if (!Number.isFinite(differenceFeet)) return '#d6e1dd'
    if (differenceFeet <= 3) return '#22c55e'
    if (differenceFeet <= 7) return '#14b8a6'
    if (differenceFeet <= 12) return '#f6c85f'
    if (differenceFeet <= 20) return '#f97316'
    return '#dc2626'
  }

  const getDepthMatchStrokeColor = (differenceFeet) => {
    if (!Number.isFinite(differenceFeet)) return 'rgb(16 32 30 / 0.56)'
    if (differenceFeet <= 12) return '#10201e'
    return '#7f1d1d'
  }

  const escapeHtml = (value) =>
    String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')

  const getPoiIconType = (name) => {
    const normalizedName = name.toLowerCase()

    if (normalizedName.includes('swim-through')) return 'arch'
    if (normalizedName.includes('pipe') || normalizedName.includes('line')) return 'pipe'
    if (normalizedName.includes('tire')) return 'tire'
    if (normalizedName.includes('engine')) return 'engine'
    if (normalizedName.includes('bed')) return 'bed'
    if (normalizedName.includes('drum')) return 'drum'
    if (normalizedName.includes('junk')) return 'pile'
    if (normalizedName.includes('dinghy')) return 'dinghy'
    if (normalizedName.includes('boat')) return 'boat'
    if (normalizedName.includes('bambi')) return 'bambi'

    return 'poi'
  }

  const getPoiIconSvg = (iconType) => {
    const icons = {
      arch:
        '<path d="M7 17v-4a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10 17v-4a2 2 0 0 1 4 0v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      bambi:
        '<path d="M12 18c2.8 0 4.5-2.1 4.5-4.6 0-1.7-1-3.1-2.2-3.9L12 12 9.7 9.5c-1.2.8-2.2 2.2-2.2 3.9C7.5 15.9 9.2 18 12 18Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.7 9.7 6.2 6.4M15.3 9.7l2.5-3.3M6.2 6.4 4.8 8M17.8 6.4 19.2 8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      bed:
        '<path d="M5 15h14M6 15v3M18 15v3M6 11h5v4H6zM11 12h7v3h-7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
      boat:
        '<path d="M4.5 13.5h15l-2.4 4H7.2l-2.7-4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 13.5V8l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
      dinghy:
        '<path d="M5 14.5c1.8-1.4 12.2-1.4 14 0-.4 2.3-2.4 3.7-7 3.7s-6.6-1.4-7-3.7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.3 12.5h7.4M10 16h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      drum:
        '<ellipse cx="12" cy="7" rx="5.4" ry="2.3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M6.6 7v9.3c0 1.3 2.4 2.3 5.4 2.3s5.4-1 5.4-2.3V7" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M6.6 11.7c0 1.3 2.4 2.3 5.4 2.3s5.4-1 5.4-2.3" fill="none" stroke="currentColor" stroke-width="1.3"/>',
      engine:
        '<circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 5.2v2.1M12 16.7v2.1M5.2 12h2.1M16.7 12h2.1M7.2 7.2l1.5 1.5M15.3 15.3l1.5 1.5M16.8 7.2l-1.5 1.5M8.7 15.3l-1.5 1.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      pile:
        '<path d="M5.3 17.5h13.4M6.5 17.5l3.2-6 3.2 6M11.4 17.5l2.9-8 3.2 8M8.7 12.8l2.3-4.3 2.1 4.3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
      pipe:
        '<path d="M5 14h8.4c1.1 0 2-.9 2-2V8.3M15.4 8.3h3.1M5 10h6.9c1.1 0 2 .9 2 2v4.7M13.9 16.7h4.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
      poi:
        '<path d="M12 19s5-4.6 5-9a5 5 0 0 0-10 0c0 4.4 5 9 5 9Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="1.8" fill="currentColor"/>',
      tire:
        '<circle cx="12" cy="12" r="6.3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 5.7v3.7M12 14.6v3.7M5.7 12h3.7M14.6 12h3.7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    }

    return icons[iconType] || icons.poi
  }

  const getPoiMarkerHtml = (poi, differenceFeet) => {
    const fillColor = getDepthMatchColor(differenceFeet)
    const strokeColor = getDepthMatchStrokeColor(differenceFeet)
    const iconType = getPoiIconType(poi.name)

    return `
      <span
        class="dead-reckoning-poi-icon dead-reckoning-poi-icon-${iconType}"
        style="--poi-fill:${fillColor};--poi-stroke:${strokeColor};"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" focusable="false">
          ${getPoiIconSvg(iconType)}
        </svg>
      </span>
    `
  }

  const createPoiMarkerIcon = (L, poi, differenceFeet = null) =>
    L.divIcon({
      className: 'dead-reckoning-poi-marker',
      html: getPoiMarkerHtml(poi, differenceFeet),
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
      tooltipAnchor: [0, -12],
    })

  const latLngToWebMercator = ({ lat, lng }) => {
    const boundedLat = Math.max(Math.min(lat, 85.05112878), -85.05112878)

    return {
      x: earthRadius * (lng * Math.PI / 180),
      y: earthRadius * Math.log(Math.tan(Math.PI / 4 + (boundedLat * Math.PI / 180) / 2)),
    }
  }

  const getDnrMeasurementAtLatLng = async (latlng) => {
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

    return value < 0
      ? { type: 'depth', meters: Math.abs(value) }
      : { type: 'elevation', meters: value }
  }

  const getDepthAtLatLng = async (latlng) => {
    const measurement = await getDnrMeasurementAtLatLng(latlng)

    return measurement?.type === 'depth' ? measurement.meters : null
  }

  const getClosestContourPointToPipeline = (line, depthFeet) => {
    const labelReference = contourLabelReferences[depthFeet] || pipelineLabelReference
    const projectedPipelineLabelReference = latLngToWebMercator(labelReference)

    return line.reduce(
      (closestPoint, [lat, lng]) => {
        const point = latLngToWebMercator({ lat, lng })
        const distanceSquared =
          (point.x - projectedPipelineLabelReference.x) ** 2 + (point.y - projectedPipelineLabelReference.y) ** 2

        return distanceSquared < closestPoint.distanceSquared
          ? { latLng: [lat, lng], distanceSquared }
          : closestPoint
      },
      { latLng: null, distanceSquared: Number.POSITIVE_INFINITY },
    )
  }

  const getGpsPopupContent = (coordinate, measurementContent, measurementLabel = t.diveMap.depth) => `
    <div class="gps-coordinate-popup-content">
      <div class="gps-coordinate-popup-row">
        <span>${t.diveMap.gpsCoordinate}</span>
        <strong>${coordinate}</strong>
      </div>
      <div class="gps-coordinate-popup-row">
        <span>${measurementLabel}</span>
        <strong>${measurementContent}</strong>
      </div>
    </div>
  `

  const getDeadReckoningPoiPopupContent = (poi, dnrDepthMeters = undefined) => {
    const dnrDepth =
      dnrDepthMeters === undefined
        ? t.diveMap.depthLoading
        : dnrDepthMeters === null
          ? t.diveMap.depthUnavailable
          : formatDepth(dnrDepthMeters)

    return `
      <div class="gps-coordinate-popup-content dead-reckoning-poi-popup-content">
        <strong class="dead-reckoning-poi-popup-title">${escapeHtml(poi.name)}</strong>
        <div class="gps-coordinate-popup-row">
          <span>${t.diveMap.gpsCoordinate}</span>
          <strong>${escapeHtml(formatCoordinate(poi))}</strong>
        </div>
        <div class="gps-coordinate-popup-row">
          <span>${t.diveMap.depth}</span>
          <strong>${escapeHtml(dnrDepth)}</strong>
        </div>
      </div>
    `
  }

  const createNoaaChartLayer = (L) =>
    L.GridLayer.extend({
      createTile(coords, done) {
        const tile = document.createElement('canvas')
        const image = new Image()
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

        tile.setAttribute('role', 'presentation')
        tile.className = 'noaa-chart-tile'
        tile.width = tileSize
        tile.height = tileSize
        image.crossOrigin = 'anonymous'
        image.decoding = 'async'
        image.onload = () => {
          const context = tile.getContext('2d', { willReadFrequently: true })

          if (!context) {
            done(null, tile)
            return
          }

          context.drawImage(image, 0, 0, tileSize, tileSize)

          try {
            const imageData = context.getImageData(0, 0, tileSize, tileSize)
            const pixels = imageData.data

            for (let index = 0; index < pixels.length; index += 4) {
              const red = pixels[index]
              const green = pixels[index + 1]
              const blue = pixels[index + 2]
              const alpha = pixels[index + 3]
              const maxChannel = Math.max(red, green, blue)
              const minChannel = Math.min(red, green, blue)
              const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue
              const saturation = maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel
              const isDarkInk = luma < 122
              const isColoredLine = saturation > 0.45 && luma < 178
              const keepPixel = alpha > 0 && (isDarkInk || isColoredLine)

              if (!keepPixel) {
                pixels[index + 3] = 0
              } else {
                pixels[index + 3] = Math.min(220, Math.max(96, alpha))
              }
            }

            context.putImageData(imageData, 0, 0)
          } catch {
            context.globalCompositeOperation = 'destination-in'
            context.fillStyle = 'rgb(0 0 0 / 0.72)'
            context.fillRect(0, 0, tileSize, tileSize)
          }

          done(null, tile)
        }
        image.onerror = () => done(new Error('NOAA chart tile failed to load'), tile)
        image.src = `${noaaChartExportUrl}?${params.toString()}`

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

  const createDepthContourLayer = (L) => {
    const contourLayer = L.layerGroup()

    loadDepthContours()
      .then((data) => {
        data.contours.forEach((contour) => {
          let labelPoint = { latLng: null, distanceSquared: Number.POSITIVE_INFINITY }

          contour.lines.forEach((line) => {
            if (line.length < 2) return

            const closestPoint = getClosestContourPointToPipeline(line, contour.depthFeet)

            if (closestPoint.distanceSquared < labelPoint.distanceSquared) {
              labelPoint = closestPoint
            }

            L.polyline(line, {
              color: '#10201e',
              weight: 1,
              opacity: 0.68,
              interactive: false,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(contourLayer)
          })

          if (labelPoint.latLng) {
            L.tooltip({
              permanent: true,
              direction: 'center',
              className: 'depth-contour-label',
              interactive: false,
            })
              .setContent(`${contour.depthFeet} ft`)
              .setLatLng(labelPoint.latLng)
              .addTo(contourLayer)
          }
        })
      })
      .catch(() => {})

    return contourLayer
  }

  const createDeadReckoningPoisLayer = (L) => {
    const poisLayer = L.layerGroup()

    loadDeadReckoningPois()
      .then((pois) => {
        pois.forEach((poi) => {
          const marker = L.marker([poi.lat, poi.lng], {
            icon: createPoiMarkerIcon(L, poi),
            bubblingMouseEvents: false,
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
            const depthMeters = poi.dnrMeasurement?.type === 'depth' ? poi.dnrMeasurement.meters : null
            const differenceFeet = getDepthDifferenceFeet(poi.sheetDepthFeet, depthMeters)

            marker.setIcon(createPoiMarkerIcon(L, poi, differenceFeet))
            event.popup.setContent(getDeadReckoningPoiPopupContent(poi, depthMeters))
          })

          const depthMeters = poi.dnrMeasurement?.type === 'depth' ? poi.dnrMeasurement.meters : null
          const differenceFeet = getDepthDifferenceFeet(poi.sheetDepthFeet, depthMeters)

          marker.setIcon(createPoiMarkerIcon(L, poi, differenceFeet))
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
      const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxNativeZoom: 19,
        maxZoom: 24,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      })
      const noaaLayer = new NoaaChartLayer({
        tileSize,
        opacity: 0.82,
        attribution: 'NOAA Office of Coast Survey',
      })
      const dnrBathymetryLayer = L.tileLayer(dnrBathymetryTileUrl, {
        tileSize,
        minZoom: 11,
        maxNativeZoom: 20,
        maxZoom: 24,
        opacity: 0.62,
        className: 'dnr-bathymetry-tile',
        attribution: 'WA DNR / USGS CoNED',
      })
      const depthContourLayer = createDepthContourLayer(L)
      const deadReckoningPoisLayer = createDeadReckoningPoisLayer(L)
      const layerControlCollapsed = window.matchMedia('(max-width: 720px)').matches

      map = L.map(mapElement, {
        center: sunnysideBeach,
        zoom: 18,
        minZoom: 11,
        maxZoom: 24,
        layers: [
          osmLayer,
          dnrBathymetryLayer,
          depthContourLayer,
          noaaLayer,
          deadReckoningPoisLayer,
        ],
        scrollWheelZoom: true,
        zoomControl: !fullSize,
      })

      map.on('click', (event) => {
        const coordinate = formatCoordinate(event.latlng)

        getDnrMeasurementAtLatLng(event.latlng)
          .then((measurement) => {
            if (!measurement) return

            const measurementLabel = measurement.type === 'elevation' ? t.diveMap.elevation : t.diveMap.depth
            const measurementContent =
              measurement.type === 'elevation' ? formatElevation(measurement.meters) : formatDepth(measurement.meters)

            L.popup({
              closeButton: true,
              className: 'gps-coordinate-popup',
            })
              .setLatLng(event.latlng)
              .setContent(getGpsPopupContent(coordinate, measurementContent, measurementLabel))
              .openOn(map)
          })
          .catch(() => {})
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
          null,
          {
            [t.diveMap.depthLayer]: dnrBathymetryLayer,
            [t.diveMap.depthContours]: depthContourLayer,
            [t.diveMap.noaaLayer]: noaaLayer,
            [t.diveMap.deadReckoningPois]: deadReckoningPoisLayer,
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
          {t.diveMap.fullTitle}
        </h1>
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
    mix-blend-mode: normal;
  }

  .sunnyside-map :global(.noaa-chart-tile) {
    opacity: 0.92;
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
    gap: 0.7rem;
    min-width: 14.5rem;
    padding: 0.85rem 1rem;
  }

  .sunnyside-map :global(.gps-coordinate-popup-row) {
    display: grid;
    gap: 0.16rem;
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
    white-space: nowrap;
  }

  .sunnyside-map :global(.depth-contour-label) {
    border: 0;
    background: rgb(248 250 247 / 0.82);
    box-shadow: none;
    color: #10201e;
    font-size: 0.62rem;
    font-weight: 900;
    letter-spacing: 0.02em;
    line-height: 1;
    padding: 0.12rem 0.22rem;
    pointer-events: none;
  }

  .sunnyside-map :global(.depth-contour-label::before) {
    display: none;
  }

  .sunnyside-map :global(.dead-reckoning-poi-marker) {
    background: transparent;
    border: 0;
  }

  .sunnyside-map :global(.dead-reckoning-poi-icon) {
    display: grid;
    width: 1.52rem;
    height: 1.52rem;
    place-items: center;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--poi-fill, #d6e1dd) 84%, white);
    box-shadow: none;
    color: #10201e;
    transition:
      background-color 220ms ease,
      transform 160ms ease;
  }

  .sunnyside-map :global(.dead-reckoning-poi-marker:hover .dead-reckoning-poi-icon),
  .sunnyside-map :global(.dead-reckoning-poi-marker:focus-visible .dead-reckoning-poi-icon) {
    transform: translateY(-1px) scale(1.05);
  }

  .sunnyside-map :global(.dead-reckoning-poi-icon svg) {
    display: block;
    width: 1.34rem;
    height: 1.34rem;
    margin: auto;
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
    gap: 0.72rem;
  }

  .sunnyside-map :global(.dead-reckoning-poi-popup-title) {
    color: var(--color-text-primary);
    font-size: 1rem;
    line-height: 1.15;
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
