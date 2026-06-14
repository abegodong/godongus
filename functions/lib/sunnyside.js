export const deadReckoningPoisCsvUrl =
  'https://docs.google.com/spreadsheets/d/1bwaJZiFD1QsQ5QXfdTSbTdl8w-dLYUfIb04nQcGkJ3c/gviz/tq?tqx=out:csv&gid=1827903938'

export const dnrBathymetrySamplesUrl =
  'https://gis.dnr.wa.gov/image/rest/services/Aquatics/WA_bathymetry_CoNED_MLLW/ImageServer/getSamples'

const earthRadius = 6378137

export const parseCsv = (csv) => {
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

export const parseCoordinate = (coordinate) => {
  const [latValue, lngValue] = String(coordinate || '')
    .split(',')
    .map((part) => Number(part.trim()))

  if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) {
    return null
  }

  return { lat: latValue, lng: lngValue }
}

export const parseOptionalNumber = (value) => {
  const parsed = Number(String(value || '').trim())

  return Number.isFinite(parsed) ? parsed : null
}

export const latLngToWebMercator = ({ lat, lng }) => {
  const boundedLat = Math.max(Math.min(lat, 85.05112878), -85.05112878)

  return {
    x: earthRadius * (lng * Math.PI / 180),
    y: earthRadius * Math.log(Math.tan(Math.PI / 4 + (boundedLat * Math.PI / 180) / 2)),
  }
}

export const getDnrMeasurementAtLatLng = async (latlng, fetcher = fetch) => {
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
  const response = await fetcher(`${dnrBathymetrySamplesUrl}?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Depth sample request failed')
  }

  const payload = await response.json()
  const value = Number(payload?.samples?.[0]?.value)

  if (!Number.isFinite(value)) {
    return null
  }

  return value < 0
    ? { type: 'depth', meters: Math.abs(value), feet: Math.abs(value) * 3.28084 }
    : { type: 'elevation', meters: value, feet: value * 3.28084 }
}

export const loadDeadReckoningPoisFromSheet = async (fetcher = fetch) => {
  const response = await fetcher(deadReckoningPoisCsvUrl, {
    headers: {
      Accept: 'text/csv,text/plain;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error('Unable to load Dead Reckoning POIs.')
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
        name: row[1].trim(),
        sheetDepthFeet: parseOptionalNumber(row[8]),
        notes: row[9] || '',
        lat: coordinate.lat,
        lng: coordinate.lng,
      }
    })
    .filter(Boolean)
}

export const buildDeadReckoningPoisDataset = async (fetcher = fetch) => {
  const pois = await loadDeadReckoningPoisFromSheet(fetcher)
  const poisWithDepth = await Promise.all(
    pois.map(async (poi) => {
      try {
        const measurement = await getDnrMeasurementAtLatLng(poi, fetcher)

        return {
          ...poi,
          dnrMeasurement: measurement,
        }
      } catch {
        return {
          ...poi,
          dnrMeasurement: null,
        }
      }
    }),
  )

  return {
    source: 'Dead Reckoning POIs sheet with WA DNR / USGS CoNED MLLW sampled depths',
    sheetUrl: deadReckoningPoisCsvUrl,
    updatedAt: new Date().toISOString(),
    count: poisWithDepth.length,
    pois: poisWithDepth,
  }
}
