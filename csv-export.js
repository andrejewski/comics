const fs = require('fs').promises
const path = require('path')
const papaParse = require('papaparse')
const index = require('./index.json')
const comics = index.comics
const baseURL = 'https://jew.ski/comics'

function capitalize (str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

async function main () {
  const rows = comics.map(comic => {
    const slug = comic.filename.split('.')[0]

    return {
      slug,
      name: capitalize(slug.split('-').join(' ')),
      image: `${baseURL}/_images/${comic.filename}`,
      published: comic.createdAt
    }
  })

  const csv = papaParse.unparse(rows)

  await fs.writeFile(path.join(__dirname, 'export.csv'), csv, { encoding: 'utf8' })
}

main()
.then(() => process.exit(0))
.catch(error => {
  console.error(error)
  process.exit(1)
})