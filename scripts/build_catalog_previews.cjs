'use strict';

const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

async function buildPreviews(root) {
  const imageDirectory = path.join(root, 'images');
  const previewDirectory = path.join(root, 'thumbnails', 'catalog');
  await fs.mkdir(previewDirectory, { recursive: true });

  const files = await fs.readdir(imageDirectory, { recursive: true });
  const previews = {};
  for (const file of files.filter(name => /\.jpe?g$/i.test(name)).sort()) {
    const input = await fs.readFile(path.join(imageDirectory, file));
    const preview = await sharp(input).autoOrient()
      .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 74 }).toBuffer();
    if (preview.length >= input.length) continue;

    const hash = createHash('sha256').update(preview).digest('hex').slice(0, 16);
    const name = `${hash}.webp`;
    await fs.writeFile(path.join(previewDirectory, name), preview);
    const urlPath = file.split(path.sep).map(encodeURIComponent).join('/');
    previews[`/images/${urlPath}`] = `/thumbnails/catalog/${name}`;
  }
  return previews;
}

buildPreviews(process.argv[2])
  .then(previews => process.stdout.write(JSON.stringify(previews)))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
