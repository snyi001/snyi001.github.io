/* ============================================================
   MATRIX.JS — Matrix Rain Canvas Background
   ============================================================ */

   'use strict';

   (function () {
     const canvas = document.getElementById('matrix-canvas');
     if (!canvas) return;
   
     const ctx    = canvas.getContext('2d');
     const CHARS  = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF<>{}[]|/\\';
     const FONT_SIZE = 14;
     let cols, drops, animId;
   
     function resize() {
       canvas.width  = window.innerWidth;
       canvas.height = window.innerHeight;
       cols  = Math.floor(canvas.width / FONT_SIZE);
       drops = Array.from({ length: cols }, () => Math.random() * -50);
     }
   
     function draw() {
       // Faint trail
       ctx.fillStyle = 'rgba(2, 3, 5, 0.05)';
       ctx.fillRect(0, 0, canvas.width, canvas.height);
   
       ctx.font = `${FONT_SIZE}px "Share Tech Mono", monospace`;
   
       for (let i = 0; i < drops.length; i++) {
         const char  = CHARS[Math.floor(Math.random() * CHARS.length)];
         const x     = i * FONT_SIZE;
         const y     = drops[i] * FONT_SIZE;
   
         // Lead character — bright green
         const brightness = Math.random();
         if (brightness > 0.95) {
           ctx.fillStyle = '#ffffff';
         } else if (brightness > 0.8) {
           ctx.fillStyle = '#00ffff';
         } else {
           ctx.fillStyle = '#00ff41';
         }
   
         ctx.fillText(char, x, y);
   
         // Reset drop randomly after it passes screen
         if (y > canvas.height && Math.random() > 0.975) {
           drops[i] = 0;
         }
         drops[i] += 0.5;
       }
   
       animId = requestAnimationFrame(draw);
     }
   
     function init() {
       resize();
       if (animId) cancelAnimationFrame(animId);
       draw();
     }
   
     let resizeTimer;
     window.addEventListener('resize', () => {
       clearTimeout(resizeTimer);
       resizeTimer = setTimeout(init, 200);
     });
   
     // Pause when tab is hidden
     document.addEventListener('visibilitychange', () => {
       if (document.hidden) {
         cancelAnimationFrame(animId);
       } else {
         draw();
       }
     });
   
     init();
   })();