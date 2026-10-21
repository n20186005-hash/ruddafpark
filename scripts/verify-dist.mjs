import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
if (!fs.existsSync(dist)) {
  console.error('dist directory is missing.');
  process.exit(1);
}

const forbidden = ['chrome-' + 'extension://', 'https://' + 'example.com', 'http://' + 'example.com', 'local' + 'host'];
const textExt = new Set(['.html', '.xml', '.txt', '.json', '.js', '.css', '.map']);
let failed = false;
/** @type {string[]} */
let sitemapFiles = [];

/** @param {string} dir */
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else {
      if (entry.name.startsWith('sitemap') && entry.name.endsWith('.xml')) sitemapFiles.push(full);
      if (!textExt.has(path.extname(entry.name))) continue;
      if (entry.name === 'wrangler.json' || entry.name === 'wrangler.jsonc') continue;
      const text = fs.readFileSync(full, 'utf8');
      for (const needle of forbidden) {
        if (text.includes(needle)) {
          console.error(`Forbidden content: ${needle} in ${full}`);
          failed = true;
        }
      }
    }
  }
}
walk(dist);

const site = process.env.SITE_URL?.trim() || 'https://ruddafpark.com';
if (site) {
  let origin;
  try {
    origin = new URL(site).origin;
    if (!origin.startsWith('https://')) throw new Error('SITE_URL must use HTTPS');
  } catch (error) {
    console.error(`Invalid SITE_URL: ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
  if (sitemapFiles.length === 0) {
    console.error('SITE_URL is set but no generated sitemap was found.');
    failed = true;
  }
  for (const file of sitemapFiles) {
    const xml = fs.readFileSync(file, 'utf8');
    if (/<lastmod>/i.test(xml)) {
      console.error(`Fabricated or unmanaged lastmod is not allowed: ${file}`);
      failed = true;
    }
    if (origin && [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].some((m) => !m[1].startsWith(origin))) {
      console.error(`A sitemap URL does not derive from SITE_URL: ${file}`);
      failed = true;
    }
  }
} else if (sitemapFiles.length > 0) {
  console.error('Sitemap exists even though SITE_URL is not configured.');
  failed = true;
}

if (failed) process.exit(1);
console.log('Build artifact checks passed.');
