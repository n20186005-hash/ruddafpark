import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { topicSlugs } from './src/data/topics.ts';

const configuredSite = process.env.SITE_URL?.trim();
const site = configuredSite || 'https://ruddafpark.com';
const siteOrigin = new URL(site).href.replace(/\/$/, '');

// Topic pages are SSR dynamic routes, which @astrojs/sitemap does not auto-discover,
// so their canonical URLs are registered explicitly here.
const topicPages = topicSlugs().map((slug) => `${siteOrigin}/${slug}/`);

export default defineConfig({
  site,
  output: 'server',
  adapter: cloudflare(),
  integrations: site ? [sitemap({
    filter: (page) => !new URL(page).pathname.startsWith('/404'),
    customPages: topicPages
  })] : [],
  vite: {
    plugins: [tailwindcss()]
  }
});
