/* Bật crossOriginIsolated trên host không cho đặt header (GitHub Pages) => ONNX/wasm chạy đa luồng.
   Service worker này thêm COOP/COEP vào mọi phản hồi. Lần mở trang đầu tiên sẽ tự tải lại 1 lần.
   Tắt khẩn cấp: mở trang với đuôi ?nocoi để gỡ service worker. */
if (typeof window === 'undefined') {
  /* ===== chạy trong service worker ===== */
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
  self.addEventListener('message', e => {
    if (e.data && e.data.type === 'coi-off') self.registration.unregister();
  });
  self.addEventListener('fetch', e => {
    const r = e.request;
    if (r.cache === 'only-if-cached' && r.mode !== 'same-origin') return;
    e.respondWith(
      fetch(r).then(res => {
        if (res.status === 0) return res;            /* phản hồi opaque: để nguyên */
        const h = new Headers(res.headers);
        h.set('Cross-Origin-Embedder-Policy', 'require-corp');
        h.set('Cross-Origin-Opener-Policy', 'same-origin');
        h.set('Cross-Origin-Resource-Policy', 'cross-origin');
        return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
      }).catch(err => { console.error('coi-sw', err); return fetch(r); })
    );
  });
} else {
  /* ===== chạy trong trang ===== */
  const SRC = document.currentScript && document.currentScript.src;  /* phải lấy trước khi await */
  (async () => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    const reg0 = await navigator.serviceWorker.getRegistration();
    if (/[?&]nocoi\b/.test(location.search)) {
      if (reg0) { await reg0.unregister(); sessionStorage.removeItem('coi-reloaded'); location.replace(location.pathname); }
      return;
    }
    if (window.crossOriginIsolated) { sessionStorage.removeItem('coi-reloaded'); return; }
    try {
      const reg = await navigator.serviceWorker.register(SRC);
      const reload = () => {
        /* chỉ tải lại 1 lần cho mỗi phiên, tránh vòng lặp vô hạn */
        if (sessionStorage.getItem('coi-reloaded')) return;
        sessionStorage.setItem('coi-reloaded', '1'); location.reload();
      };
      if (navigator.serviceWorker.controller) reload();
      else navigator.serviceWorker.addEventListener('controllerchange', reload);
      if (reg.active && !navigator.serviceWorker.controller) reload();
    } catch (e) { console.warn('coi-serviceworker lỗi:', e); }
  })();
}
