import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildDeadReckoningPoisDataset } from '../functions/lib/sunnyside.js'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = join(projectRoot, 'public', 'data', 'sunnyside-pois.json')

const dataset = await buildDeadReckoningPoisDataset(fetch)

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`)

console.log(`Wrote ${dataset.count} POIs to ${outputPath}`)
