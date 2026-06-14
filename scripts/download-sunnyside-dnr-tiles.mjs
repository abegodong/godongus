import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputRoot = join(projectRoot, 'public', 'data', 'sunnyside-dnr-tiles')
const dnrBathymetryExportUrl =
  'https://gis.dnr.wa.gov/image/rest/services/Aquatics/WA_bathymetry_CoNED_MLLW/ImageServer/exportImage'
const renderingRule = JSON.stringify({ rasterFunction: 'bathy_top50m' })
const tileSize = 256
const earthRadius = 6378137
const originShift = Math.PI * earthRadius
const zoomLevels = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
const tileBuffer = 1
const bounds = {
  north: 47.18025,
  south: 47.17755,
  west: -122.59535,
  east: -122.58945,
}
const force = process.argv.includes('--force')

const lonToTileX = (lng, zoom) => Math.floor(((lng + 180) / 360) * 2 ** zoom)

const latToTileY = (lat, zoom) => {
  const latRadians = lat * Math.PI / 180

  return Math.floor(((1 - Math.asinh(Math.tan(latRadians)) / Math.PI) / 2) * 2 ** zoom)
}

const tileBoundsToWebMercatorBbox = ({ x, y, z }) => {
  const resolution = (2 * Math.PI * earthRadius) / (tileSize * 2 ** z)
  const minX = x * tileSize * resolution - originShift
  const maxX = (x + 1) * tileSize * resolution - originShift
  const maxY = originShift - y * tileSize * resolution
  const minY = originShift - (y + 1) * tileSize * resolution

  return [minX, minY, maxX, maxY].join(',')
}

const getTileUrl = (tile) => {
  const params = new URLSearchParams({
    bbox: tileBoundsToWebMercatorBbox(tile),
    bboxSR: '3857',
    imageSR: '3857',
    size: `${tileSize},${tileSize}`,
    format: 'png32',
    transparent: 'true',
    renderingRule,
    f: 'image',
  })

  return `${dnrBathymetryExportUrl}?${params.toString()}`
}

const tiles = zoomLevels.flatMap((z) => {
  const xStart = lonToTileX(bounds.west, z) - tileBuffer
  const xEnd = lonToTileX(bounds.east, z) + tileBuffer
  const yStart = latToTileY(bounds.north, z) - tileBuffer
  const yEnd = latToTileY(bounds.south, z) + tileBuffer
  const currentTiles = []

  for (let x = xStart; x <= xEnd; x += 1) {
    for (let y = yStart; y <= yEnd; y += 1) {
      currentTiles.push({ z, x, y })
    }
  }

  return currentTiles
})

let downloaded = 0
let skipped = 0

for (const tile of tiles) {
  const outputPath = join(outputRoot, String(tile.z), String(tile.x), `${tile.y}.png`)

  if (!force && existsSync(outputPath)) {
    skipped += 1
    continue
  }

  const response = await fetch(getTileUrl(tile))

  if (!response.ok) {
    throw new Error(`DNR tile request failed for ${tile.z}/${tile.x}/${tile.y}`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, bytes)
  downloaded += 1
}

console.log(`DNR tiles ready: ${downloaded} downloaded, ${skipped} skipped, ${tiles.length} total`)
