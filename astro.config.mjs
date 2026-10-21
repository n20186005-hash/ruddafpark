import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const configuredSite = process.env.SITE_URL?.trim();
const site = configuredSite || 'https://ruddafpark.com';

export default defineConfig({
  site,
  output: 'server',
  adapter: cloudflare(),
  integrations: site ? [sitemap({ filter: (page) => !new URL(page).pathname.startsWith('/404') })] : [],
  vite: {
    plugins: [tailwindcss()]
  }
});
