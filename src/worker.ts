import astroWorker from '@astrojs/cloudflare/entrypoints/server';

export default {
  async fetch(...args: Parameters<typeof astroWorker.fetch>) {
    const [request] = args;
    const url = new URL(request.url);
    if ((url.hostname === 'ruddafpark.com' && url.protocol === 'http:') || url.hostname === 'www.ruddafpark.com') {
      url.hostname = 'ruddafpark.com'; url.protocol = 'https:'; url.port = '';
      return Response.redirect(url, 301);
    }
    const response = await astroWorker.fetch(...args);
    if (response.status !== 404) return response;
    const errorResponse = new Response(response.body, response);
    errorResponse.headers.set('X-Robots-Tag', 'noindex, follow');
    return errorResponse;
  }
};
