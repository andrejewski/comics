const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const pug = require('pug')
const moment = require('moment')

const comicsDir = path.join(__dirname, 'comics')
const comicsIndex = path.join(__dirname, 'index.json')
const comicsTemplate = path.join(__dirname, 'index.pug')
const comicsPage = path.join(__dirname, 'index.html')

const readDir = promisify(fs.readdir)
const lstat = promisify(fs.lstat)
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

const indexOptions = {
  encoding: 'utf8'
}

const oldestFirst = (a, b) => new Date(a.createdAt) - new Date(b.createdAt)

async function main () {
  const allFilenames = await readDir(comicsDir)
  const comicFilenames = allFilenames.filter(name => !name.startsWith('.'))

  const currentIndex = await readFile(comicsIndex, indexOptions)
  const { comics: existingComics } = JSON.parse(currentIndex)
  const trackedComics = existingComics.reduce(
    (o, comic) => ({ ...o, [comic.filename]: true }),
    {}
  )
  const filenames = comicFilenames.filter(name => !trackedComics[name])

  const stats = await Promise.all(
    filenames.map(filename => lstat(path.join(comicsDir, filename)))
  )
  const newComics = filenames.map((filename, index) => {
    const stat = stats[index]
    const createdAt = stat.birthtime.toISOString()
    return { filename, createdAt }
  })

  const comics = existingComics.concat(newComics).sort(oldestFirst)

  await writeFile(
    comicsIndex,
    JSON.stringify({ comics }, null, 2),
    indexOptions
  )

  await writeFile(
    comicsPage,
    pug.renderFile(comicsTemplate, { comics: comics.reverse(), moment }),
    indexOptions
  )
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
