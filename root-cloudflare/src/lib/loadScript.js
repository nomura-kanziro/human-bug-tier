// CDN 스크립트를 필요할 때만 1회 로드한다 (html2canvas · jsPDF).
// 다운로드를 한 번도 안 누르면 아예 받지 않으므로 첫 로딩이 가벼워진다.
const cache = new Map();

export function loadScript(src) {
  if (cache.has(src)) return cache.get(src);
  const promise = new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => { cache.delete(src); reject(new Error(`스크립트 로드 실패: ${src}`)); };
    document.head.appendChild(el);
  });
  cache.set(src, promise);
  return promise;
}

export async function loadHtml2Canvas() {
  if (!window.html2canvas) await loadScript('https://html2canvas.hertzen.com/dist/html2canvas.min.js');
  return window.html2canvas;
}

export async function loadJsPdf() {
  if (!window.jspdf) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  return window.jspdf.jsPDF;
}
