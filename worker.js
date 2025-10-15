addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// Whitelist of allowed domains to prevent SSRF attacks
const ALLOWED_HOSTNAMES = [
  '1page.tools',
  'www.1page.tools',
  'rayapur.github.io'
]

const GITHUB_PAGES_ORIGIN = 'https://rayapur.github.io'
const GITHUB_PAGES_PATH = '/1page.tools'

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Validate hostname - prevent SSRF by only allowing whitelisted domains
  if (!ALLOWED_HOSTNAMES.includes(url.hostname)) {
    return new Response('Forbidden', { status: 403 })
  }
  
  // Force HTTPS redirect AND www to non-www in one step to avoid double redirects
  if (url.protocol === 'http:' || url.hostname === 'www.1page.tools') {
    const redirectUrl = new URL(request.url)
    redirectUrl.protocol = 'https:'
    redirectUrl.hostname = '1page.tools'
    
    // Use 308 Permanent Redirect (preserves method) for HTTPS, more secure
    return Response.redirect(redirectUrl.toString(), 308)
  }
  
  // Build safe target URL - never use user input directly
  // Always fetch from our GitHub Pages origin with sanitized path
  const safePath = url.pathname + url.search
  const targetUrl = GITHUB_PAGES_ORIGIN + GITHUB_PAGES_PATH + safePath
  
  // Validate the final target URL before fetching
  const targetUrlObj = new URL(targetUrl)
  if (targetUrlObj.hostname !== 'rayapur.github.io') {
    return new Response('Invalid target', { status: 400 })
  }
  
  // Get the original response from GitHub Pages
  const response = await fetch(targetUrl)
  
  // Clone the response so we can modify headers
  const newResponse = new Response(response.body, response)
  
  // Add security headers with exact values
  // Remove old cache headers that might interfere
  newResponse.headers.delete('cache-control')
  newResponse.headers.delete('expires')
  
  // Set fresh cache control for HTML pages
  if (response.headers.get('content-type')?.includes('text/html')) {
    newResponse.headers.set('Cache-Control', 'public, max-age=300, must-revalidate')
  }
  
  newResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  newResponse.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagservices.com https://adservice.google.com https://www.google-analytics.com https://www.gstatic.com https://googleads.g.doubleclick.net https://partner.googleadservices.com https://static.cloudflareinsights.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; script-src-elem 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://www.googletagservices.com https://adservice.google.com https://www.google-analytics.com https://www.gstatic.com https://googleads.g.doubleclick.net https://partner.googleadservices.com https://static.cloudflareinsights.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com https://www.gstatic.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://www.google-analytics.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://adtrafficquality.google https://*.adtrafficquality.google; frame-src 'self' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.google.com https://tpc.googlesyndication.com https://td.doubleclick.net https://*.googlesyndication.com; child-src 'self' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net; object-src 'none'; base-uri 'self'; form-action 'self'")
  newResponse.headers.set('X-Frame-Options', 'DENY')
  newResponse.headers.set('X-Content-Type-Options', 'nosniff')
  newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  newResponse.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=()')
  
  return newResponse
}