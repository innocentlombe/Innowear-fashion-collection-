import { StoreSettings } from '../types';

export function slugifyBusinessName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'innowear-fashion-collection';
}

export function getEffectiveBaseUrl(customUrl?: string): string {
  const trimmed = (customUrl || '').trim().replace(/\/+$/, '');
  if (trimmed) {
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }
  if (typeof window !== 'undefined') {
    const cleanPath = window.location.pathname.replace(/\/+$/, '');
    return `${window.location.origin}${cleanPath}`;
  }
  return '';
}

export function buildBusinessAppLinks(settings: Pick<StoreSettings, 'storeName' | 'businessSlug' | 'businessAppUrl'>) {
  const slug = slugifyBusinessName(settings.businessSlug || settings.storeName);
  const baseUrl = getEffectiveBaseUrl(settings.businessAppUrl);
  const businessAppUrl = baseUrl ? `${baseUrl}/?app=${slug}` : `/?app=${slug}`;
  const customerOrderAppUrl = baseUrl
    ? `${baseUrl}/?app=${slug}&mode=customer`
    : `/?app=${slug}&mode=customer`;

  return {
    slug,
    baseUrl,
    businessAppUrl,
    customerOrderAppUrl,
  };
}

export function downloadBusinessAppShortcut(
  settings: StoreSettings,
  mode: 'business' | 'customer' = 'business'
): string {
  const { slug, businessAppUrl, customerOrderAppUrl } = buildBusinessAppLinks(settings);
  const targetUrl = mode === 'customer' ? customerOrderAppUrl : businessAppUrl;
  const label =
    mode === 'customer'
      ? `${settings.storeName} — Customer Ordering App`
      : `${settings.storeName} — Business Application`;
  const fileName = mode === 'customer' ? `${slug}-customer-shop.html` : `${slug}-business-app.html`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0; url=${targetUrl}" />
  <title>${label}</title>
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#09090b;color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center;">
  <div style="max-width:420px;padding:32px;border:1px solid #d4af37;border-radius:10px;background:#141418;">
    <h1 style="margin:0;letter-spacing:3px;color:#d4af37;font-size:26px;">INNOWEAR</h1>
    <p style="margin:8px 0 0;font-size:14px;font-weight:600;">${settings.storeName}</p>
    <p style="margin:12px 0 20px;font-size:12px;color:#a1a1aa;">Opening your ${
      mode === 'customer' ? 'customer ordering storefront' : 'business management application'
    }...</p>
    <a href="${targetUrl}" style="display:inline-block;padding:10px 20px;background:#d4af37;color:#09090b;font-weight:700;font-size:13px;border-radius:6px;text-decoration:none;">
      Launch ${settings.storeName}
    </a>
  </div>
  <script>window.location.replace(${JSON.stringify(targetUrl)});</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return fileName;
}
