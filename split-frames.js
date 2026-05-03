const fs = require('fs')
const path = require('path')
const { PNG } = require('pngjs')

const WHITE_THRESHOLD = 250
const MIN_GAP_ROWS = 3
const MIN_FRAME_ROWS = 10

function isRowBlank (png, y) {
  const { width, data } = png
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) << 2
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a < 10) continue
    if (r < WHITE_THRESHOLD || g < WHITE_THRESHOLD || b < WHITE_THRESHOLD) {
      return false
    }
  }
  return true
}

function findFrameRanges (png) {
  const { height } = png
  const blank = new Array(height)
  for (let y = 0; y < height; y++) blank[y] = isRowBlank(png, y)

  const ranges = []
  let start = null
  let lastContent = null
  let gapLen = 0

  for (let y = 0; y < height; y++) {
    if (!blank[y]) {
      if (start === null) start = y
      lastContent = y
      gapLen = 0
    } else if (start !== null) {
      gapLen++
      if (gapLen >= MIN_GAP_ROWS) {
        if (lastContent - start + 1 >= MIN_FRAME_ROWS) {
          ranges.push([start, lastContent])
        }
        start = null
        gapLen = 0
      }
    }
  }
  if (start !== null && lastContent - start + 1 >= MIN_FRAME_ROWS) {
    ranges.push([start, lastContent])
  }
  return ranges
}

function cropRows (png, yStart, yEnd) {
  const { width, data } = png
  const h = yEnd - yStart + 1
  const out = new PNG({ width, height: h })
  const srcOffset = yStart * width * 4
  data.copy(out.data, 0, srcOffset, srcOffset + width * h * 4)
  return out
}

function padWithBorder (png, border) {
  const newWidth = png.width + border * 2
  const newHeight = png.height + border * 2
  const out = new PNG({ width: newWidth, height: newHeight })
  out.data.fill(255)
  for (let y = 0; y < png.height; y++) {
    const srcStart = y * png.width * 4
    const dstStart = ((y + border) * newWidth + border) * 4
    png.data.copy(out.data, dstStart, srcStart, srcStart + png.width * 4)
  }
  return out
}

function main () {
  const input = process.argv[2]
  if (!input) {
    console.error('Usage: node split-frames.js <comic-name-or-path> [outDir]')
    process.exit(1)
  }

  const inputPath = fs.existsSync(input)
    ? input
    : path.join(__dirname, 'images', `${input}.png`)
  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`)
    process.exit(1)
  }

  const base = path.basename(inputPath, path.extname(inputPath))
  const outDir = process.argv[3] || path.join(__dirname, 'frames', base)
  fs.mkdirSync(outDir, { recursive: true })

  const png = PNG.sync.read(fs.readFileSync(inputPath))
  const ranges = findFrameRanges(png)

  if (ranges.length === 0) {
    console.error('No frames detected.')
    process.exit(1)
  }

  if (ranges.length > 1) {
    const [titleStart] = ranges[0]
    const [, firstEnd] = ranges[1]
    ranges.splice(0, 2, [titleStart, firstEnd])
  }

  ranges.forEach(([yStart, yEnd], i) => {
    const frame = cropRows(png, yStart, yEnd)
    const border = Math.round(frame.width * 0.05)
    const padded = padWithBorder(frame, border)
    const outPath = path.join(outDir, `${base}-${i + 1}.png`)
    fs.writeFileSync(outPath, PNG.sync.write(padded))
    console.log(`wrote ${outPath} (rows ${yStart}-${yEnd})`)
  })
}

main()
