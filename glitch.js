/* ============================================================
   GLITCH.JS — Glitch Text & Visual Effects
   ============================================================ */

   'use strict';

   // ── Canvas-based scanline overlay ──
   function createScanlineCanvas() {
     const existing = document.getElementById('scanline-overlay');
     if (existing) return;
   
     const canvas   = document.createElement('canvas');
     canvas.id      = 'scanline-overlay';
     canvas.style.cssText = `
       position: fixed; top: 0; left: 0;
       width: 100%; height: 100%;
       pointer-events: none;
       z-index: 9998;
       opacity: 0.025;
       mix-blend-mode: overlay;
     `;
     document.body.appendChild(canvas);
   
     const ctx = canvas.getContext('2d');
   
     function draw() {
       canvas.width  = window.innerWidth;
       canvas.height = window.innerHeight;
       ctx.clearRect(0, 0, canvas.width, canvas.height);
   
       for (let y = 0; y < canvas.height; y += 4) {
         ctx.fillStyle = 'rgba(0,255,65,0.08)';
         ctx.fillRect(0, y, canvas.width, 1);
       }
     }
   
     draw();
     window.addEventListener('resize', draw);
   }
   
   // ── Random glitch flash on headings ──
   function initHeaderGlitch() {
     const targets = document.querySelectorAll('h1, h2, .glitch-auto');
   
     targets.forEach(el => {
       if (!el.dataset.text) {
         el.dataset.text = el.textContent;
       }
       el.classList.add('glitch-text');
     });
   
     function glitchRandom() {
       if (!targets.length) return;
       const el = targets[Math.floor(Math.random() * targets.length)];
       triggerGlitch(el);
       setTimeout(glitchRandom, 2500 + Math.random() * 4000);
     }
   
     glitchRandom();
   }
   
   function triggerGlitch(el) {
     if (!el) return;
     el.classList.add('glitch-active');
   
     // Optional: briefly corrupt text
     const original = el.dataset.text || el.textContent;
     const CORRUPT  = '!@#$%^&*<>[]{}|\\/?;:';
     let iterations = 0;
     const max      = 6;
   
     const interval = setInterval(() => {
       el.textContent = original.split('').map((char, idx) => {
         if (char === ' ') return ' ';
         if (iterations > max * 0.6) return char;
         return Math.random() > 0.75
           ? CORRUPT[Math.floor(Math.random() * CORRUPT.length)]
           : char;
       }).join('');
   
       iterations++;
       if (iterations >= max) {
         clearInterval(interval);
         el.textContent = original;
         el.classList.remove('glitch-active');
       }
     }, 60);
   }
   
   // ── RGB split on hover ──
   function initRGBSplit() {
     document.querySelectorAll('.rgb-split').forEach(el => {
       el.addEventListener('mouseenter', () => {
         el.style.textShadow = `
           2px 0 0 rgba(255,0,0,0.6),
          -2px 0 0 rgba(0,255,255,0.6)
         `;
         el.style.transition = 'text-shadow 0.1s';
       });
       el.addEventListener('mouseleave', () => {
         el.style.textShadow = '';
       });
     });
   }
   
   // ── CRT flicker effect ──
   function initCRTFlicker() {
     const overlay = document.createElement('div');
     overlay.id    = 'crt-flicker';
     overlay.style.cssText = `
       position: fixed; inset: 0;
       pointer-events: none;
       z-index: 9997;
       background: transparent;
       animation: crtFlicker 0.15s infinite linear;
       opacity: 0;
     `;
     document.body.appendChild(overlay);
   
     // Inject keyframes
     const style = document.createElement('style');
     style.textContent = `
       @keyframes crtFlicker {
         0%   { opacity: 0; }
         92%  { opacity: 0; }
         93%  { opacity: 0.03; background: rgba(0,255,65,0.03); }
         94%  { opacity: 0; }
         98%  { opacity: 0; }
         99%  { opacity: 0.02; background: rgba(0,255,255,0.02); }
         100% { opacity: 0; }
       }
     `;
     document.head.appendChild(style);
   }
   
   // ── Data-stream decoration on section headers ──
   function initDataStream() {
     document.querySelectorAll('.section-header__pre').forEach(el => {
       const stream = document.createElement('span');
       stream.className  = 'data-stream';
       stream.style.cssText = `
         font-family: var(--font-mono);
         font-size: 0.65rem;
         color: var(--clr-text-muted);
         margin-left: auto;
         letter-spacing: 1px;
         opacity: 0.5;
       `;
   
       function updateStream() {
         const hex = Array.from({ length: 6 }, () =>
           Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
         ).join(' ');
         stream.textContent = hex;
       }
   
       updateStream();
       setInterval(updateStream, 800);
       el.appendChild(stream);
     });
   }
   
   // ── Boot ──
   document.addEventListener('DOMContentLoaded', () => {
     createScanlineCanvas();
     initHeaderGlitch();
     initRGBSplit();
     initCRTFlicker();
     initDataStream();
   });
   
   window.triggerGlitch = triggerGlitch;