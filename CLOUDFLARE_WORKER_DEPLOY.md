# 🚀 Cloudflare Worker Deployment Guide

## ⚠️ CRITICAL: Remove Conflicting Rules First!

Before deploying this worker, you MUST:

1. Go to **Cloudflare Dashboard** → **1page.tools** → **Rules**
2. **DELETE** or **DISABLE** any existing:
   - Transform Rules
   - Page Rules
   - Configuration Rules
   - HTTP Response Header Modification rules

These will conflict with the Worker and cause malformed headers like:
- `'Header name: Referrer-Policy Value: ...'` ❌

---

## 📝 Worker Code (Copy-Paste Into Cloudflare)

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const ALLOWED_HOSTNAMES = [
  '1page.tools',
  'www.1page.tools',
  'rayapur.github.io'
]

const GITHUB_PAGES_ORIGIN = 'https://rayapur.github.io'
const GITHUB_PAGES_PATH = '/1page.tools'

async function handleRequest(request) {
  const url = new URL(request.url)
  
  if (!ALLOWED_HOSTNAMES.includes(url.hostname)) {
    return new Response('Forbidden', { status: 403 })
  }
  
  if (url.protocol === 'http:') {
    url.protocol = 'https:'
    return Response.redirect(url.toString(), 301)
  }
  
  if (url.hostname === 'www.1page.tools') {
    url.hostname = '1page.tools'
    return Response.redirect(url.toString(), 301)
  }
  
  const safePath = url.pathname + url.search
  const targetUrl = GITHUB_PAGES_ORIGIN + GITHUB_PAGES_PATH + safePath
  
  const targetUrlObj = new URL(targetUrl)
  if (targetUrlObj.hostname !== 'rayapur.github.io') {
    return new Response('Invalid target', { status: 400 })
  }
  
  const response = await fetch(targetUrl)
  const newResponse = new Response(response.body, response)
  
  newResponse.headers.delete('cache-control')
  newResponse.headers.delete('expires')
  
  if (response.headers.get('content-type')?.includes('text/html')) {
    newResponse.headers.set('Cache-Control', 'public, max-age=300, must-revalidate')
  }
  
  newResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  newResponse.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagservices.com https://adservice.google.com https://www.google-analytics.com https://www.gstatic.com https://googleads.g.doubleclick.net https://partner.googleadservices.com https://static.cloudflareinsights.com; script-src-elem 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://www.googletagservices.com https://adservice.google.com https://www.google-analytics.com https://www.gstatic.com https://googleads.g.doubleclick.net https://partner.googleadservices.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com https://www.gstatic.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://www.google-analytics.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://adtrafficquality.google https://*.adtrafficquality.google; frame-src 'self' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.google.com https://tpc.googlesyndication.com https://td.doubleclick.net https://*.googlesyndication.com; child-src 'self' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net; object-src 'none'; base-uri 'self'; form-action 'self'")
  newResponse.headers.set('X-Frame-Options', 'DENY')
  newResponse.headers.set('X-Content-Type-Options', 'nosniff')
  newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  newResponse.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=()')
  
  return newResponse
}
```

---

## 🔧 Deployment Steps

### Step 1: Clean Up Existing Rules
1. Cloudflare Dashboard → **1page.tools** → **Rules**
2. Delete/Disable ALL rules related to security headers
3. Confirm no Transform Rules exist

### Step 2: Deploy Worker
1. Go to **Workers & Pages** → Your worker (e.g., `security-headers-worker`)
2. Click **Quick Edit** or **Edit Code**
3. **Delete ALL existing code**
4. **Paste the worker code above**
5. Click **Save and Deploy**

### Step 3: Verify Route
1. Go to **Workers Routes** (or your worker settings)
2. Ensure route is: `*1page.tools/*` or `1page.tools/*`
3. Confirm worker is **enabled**

### Step 4: Clear Cache
1. Cloudflare Dashboard → **Caching** → **Configuration**
2. Click **Purge Everything**
3. Confirm purge

### Step 5: Test
1. Open Chrome DevTools → **Network** tab
2. Visit `https://1page.tools`
3. Click the response → **Headers**
4. Verify headers look correct (no "Header name:" prefix)

---

## ✅ Expected Response Headers

```
strict-transport-security: max-age=31536000; includeSubDomains; preload
content-security-policy: default-src 'self'; script-src 'self' ...
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: geolocation=(), microphone=() ...
```

---

## 🐛 Troubleshooting

### If you still see "Header name: ..." errors:
- **Transform Rules are still active** → Delete them!
- **Page Rules are interfering** → Disable security-related Page Rules
- **Cache not purged** → Purge Everything again
- **Browser cache** → Hard refresh (Cmd+Shift+R)

### If Service Worker shows 503 errors:
- Unregister Service Worker in DevTools → Application → Service Workers
- Hard refresh the page
- The new Service Worker will auto-register

---

## 📊 Success Checklist

- [ ] No "Header name:" errors in console
- [ ] Material Icons visible on page
- [ ] No CSP violations in console (except the warning about allowlist)
- [ ] `https://1page.tools` loads with A grade on securityheaders.com
- [ ] AdSense loads without errors
- [ ] Cloudflare Insights loads without errors

---

## 🆘 Still Having Issues?

Check **Cloudflare Dashboard** → **Analytics** → **Security Events** to see if the Worker is actually being triggered.

Run this in terminal to check headers:
```bash
curl -I https://1page.tools
```

Look for properly formatted headers (no "Header name:" prefix).

