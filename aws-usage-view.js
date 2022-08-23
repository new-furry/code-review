const S3 = require('aws-sdk/clients/s3')
const { resolve } = require('path')
const { readdir } = require('fs').promises
const fs = require('fs')
const mongoose = require('mongoose')
const randomstring = require('randomstring')
const https = require('https')

const maleCollectionId = ''
const femaleCollectionId = ''

const categoryMap = {}

const s3 = new S3({
  credentials: {
    accessKeyId: '',
    secretAccessKey: '',
  },
  region: 'us-east-2',
  signatureVersion: 'v4',
})

;(async function () {
  await main()
})()

async function main() {
  const cardMap = {}
  const cardAssetMap = {}
  for await (const f of getFiles('./importData')) {
    const split = f.split('/')
    const importDataIndex = split.findIndex((s) => s === 'importData') + 1
    const elements = split.slice(importDataIndex)
    if (!cardMap[elements[0]]) {
      cardMap[elements[0]] = {}
      cardAssetMap[elements[0]] = {}
    }
    if (!cardMap[elements[0]][elements[1]]) {
      cardMap[elements[0]][elements[1]] = []
    }
    cardMap[elements[0]][elements[1]].push(f)
  }

  for (const category in cardMap) {
    for (const card in cardMap[category]) {
      const assetList = cardMap[category][card]
      const map = assetListToMap(assetList)
      cardAssetMap[category][card] = map
    }
  }
  // console.log(cardAssetMap)
  for (const category in cardAssetMap) {
    const categoryId = getCollectionIdFromName(category)
    for (const card in cardAssetMap[category]) {
      const newCardObj = { title: card, category: [categoryId] }
      const keys = cardAssetMap[category][card]
      for (const type in keys) {
        const asset = keys[type]
        if (type === 'mp4') {
          const video = await uploadToS3(asset)
          newCardObj.videoUrl = video
        } else if (type === 'mp3') {
          const audio = await uploadToS3(asset)
          newCardObj.audioUrl = audio
        } else if (type === 'jpg') {
          const image = await uploadToS3(asset)
          newCardObj.imageUrl = image
        }
      }
      console.log(newCardObj)
      await createCard(newCardObj)
    }
  }

  process.exit(0)
}

function assetListToMap(assets) {
  const assetMap = {}
  for (const asset in assets) {
    assetMap[getExtension(assets[asset])] = assets[asset]
  }
  return assetMap
}

function getExtension(file) {
  return file.split('.')[1]
}

function getCollectionIdFromName(name) {
  if (name === 'Male Exercises - Final') {
    return maleCollectionId
  } else {
    return femaleCollectionId
  }
}

async function* getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true })
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name)
    if (dirent.isDirectory()) {
      yield* getFiles(res)
    } else {
      yield res
    }
  }
}

async function uploadToS3(file) {
  const fileContent = fs.readFileSync(file)
  const id = randomstring.generate()
  const extension = getExtension(file)
  const newFileName = `${id}.${extension}`
  const params = {
    Bucket: 'bucket/cards',
    Key: newFileName,
    Body: fileContent,
    ACL: 'public-read',
  }

  console.log(`Uploading ${newFileName}`)
  return new Promise((res, rej) => {
    const request = s3.putObject(params, function (err, data) {
      if (err) {
        console.warn(`Error ${newFileName}`)
        rej(err)
      } else {
        console.log(`Success ${newFileName}`)
        res(
          `https://path/${newFileName}`,
        )
      }
    })
    request.send()
  })
}

async function createCard(card) {
  const data = JSON.stringify(card)
  const options = {
    hostname: 'host.com',
    port: 443,
    path: '/cards',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      Authorization:
        'Bearer **',
    },
  }
  return new Promise((resolve, rej) => {
    const req = https.request(options, (res) => {
      console.log(`statusCode: ${res.statusCode}`)

      res.on('data', (d) => {
        // process.stdout.write(d)
        resolve(d)
      })
    })

    req.on('error', (error) => {
      console.error(error)
      rej(error)
    })

    req.write(data)
    req.end()
  })
}
