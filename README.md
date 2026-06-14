# godong.us

Personal website built with Svelte, Vite, Tailwind CSS, and a Cloudflare Worker for API routes.

## Development

```sh
npm install
npm run dev
```

Build for Cloudflare:

```sh
npm run build
```

## Sunnyside Dive Map Data

The Sunnyside map uses self-hosted static assets for faster normal page loads:

- `public/data/sunnyside-dnr-tiles/` stores the local DNR/USGS depth-shading tiles.
- `public/data/sunnyside-pois.json` stores POIs from the Google Sheet with sampled DNR/USGS depth.
- `public/data/sunnyside-depth-contours.json` stores the contour line overlay used by the map.
- `public/data/sunnyside-depth-contours.geojson` stores the exported contour lines.

Refresh the local POI JSON from Google Sheets and resample DNR/USGS depth:

```sh
npm run map:update-pois
```

Refresh the local DNR/USGS tile cache:

```sh
npm run map:download-dnr
```

Force a tile redownload:

```sh
npm run map:download-dnr -- --force
```

## Cloudflare POI Refresh Endpoint

The Worker includes a protected endpoint:

```txt
POST /api/sunnyside/pois/update
Authorization: Bearer <SUNNYSIDE_UPDATE_TOKEN>
```

When a `SUNNYSIDE_POIS` KV binding is configured, the endpoint refreshes the POIs from Google Sheets, samples DNR/USGS depth for each point, and saves the JSON into KV. The map reads `/api/sunnyside/pois` first and falls back to the committed static JSON if KV is not configured or unavailable.

Required Cloudflare configuration for live POI refresh:

- Secret or variable: `SUNNYSIDE_UPDATE_TOKEN`
- KV binding: `SUNNYSIDE_POIS`
