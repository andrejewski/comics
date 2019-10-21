const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const pug = require('pug')
const moment = require('moment')

const publicDir = path.join(__dirname, 'docs')
const comicsDir = path.join(publicDir, '_images')
const comicsIndex = path.join(__dirname, 'index.json')
const comicsTemplate = path.join(__dirname, 'index.pug')
const comicTemplate = path.join(__dirname, 'comic.pug')
const comicsPage = path.join(publicDir, 'index.html')

const makeDir = promisify(fs.mkdir)
const readDir = promisify(fs.readdir)
const lstat = promisify(fs.lstat)
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

const fileOptions = {
  encoding: 'utf8'
}

const ensureDir = async path => {
  try {
    await makeDir(path)
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error
    }
  }
}

const basePath = '/comics'

const baseName = filename => path.basename(filename, path.extname(filename))

const oldestFirst = (a, b) => new Date(a.createdAt) - new Date(b.createdAt)

async function main () {
  const allFilenames = await readDir(comicsDir)
  const comicFilenames = allFilenames.filter(name => !name.startsWith('.'))

  const currentIndex = await readFile(comicsIndex, fileOptions)
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

  const comicList = existingComics.concat(newComics).sort(oldestFirst)

  await writeFile(
    comicsIndex,
    JSON.stringify({ comics: comicList }, null, 2),
    fileOptions
  )

  const comics = comicList.map(comic => {
    const name = baseName(comic.filename)

    return { ...comic, name, href: `${basePath}/${name}` }
  })

  await writeFile(
    comicsPage,
    pug.renderFile(comicsTemplate, {
      comics: comics.slice(0).reverse(),
      moment
    }),
    fileOptions
  )

  const comicPages = comics
    .map(comic => {
      const name = baseName(comic.filename)

      return { ...comic, name, href: `${basePath}/${name}` }
    })
    .map((comic, index) => {
      const previous = comics[index - 1]
      const next = comics[index + 1]

      return {
        comic,
        previous,
        next
      }
    })

  await Promise.all(
    comicPages.map(async page => {
      const vanityPath = path.join(publicDir, page.comic.name)
      const realPath = path.join(vanityPath, 'index.html')

      await ensureDir(vanityPath)

      return writeFile(
        realPath,
        pug.renderFile(comicTemplate, { page, moment }),
        fileOptions
      )
    })
  )
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
