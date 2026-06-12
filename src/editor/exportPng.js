// exportPng.js — rasterize the currently visible view SVG to a PNG download.
// SVG → XMLSerializer → blob URL → Image → canvas (2× for sharpness) → PNG.
// Door-design photos are same-origin (/public), so the canvas stays untainted.

import { triggerDownload } from './storage.js';

const SCALE = 2;
const BG = '#f1e7d2'; // cream — matches the editor canvas behind the SVG

export function exportSvgToPng(svgEl, filename) {
  return new Promise((resolve, reject) => {
    const vb = svgEl.viewBox.baseVal;
    const width = vb && vb.width ? vb.width : svgEl.clientWidth;
    const height = vb && vb.height ? vb.height : svgEl.clientHeight;

    const clone = svgEl.cloneNode(true);
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const svgBlob = new Blob([new XMLSerializer().serializeToString(clone)], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * SCALE);
      canvas.height = Math.round(height * SCALE);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('PNG encoding failed'));
          return;
        }
        triggerDownload(blob, filename);
        resolve();
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not render SVG'));
    };
    img.src = url;
  });
}
