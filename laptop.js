/* ============================================================
   LAPTOP.JS — Laptop Explosion Scroll Effect (GSAP + ScrollTrigger)
   ============================================================ */

   'use strict';

   document.addEventListener('DOMContentLoaded', () => {
     if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
       console.warn('GSAP or ScrollTrigger not loaded.');
       return;
     }
   
     gsap.registerPlugin(ScrollTrigger);
   
     const scene          = document.getElementById('laptop-scene');
     const screenEl       = document.getElementById('laptop-screen');
     const keyboardEl     = document.getElementById('laptop-keyboard');
     const internalsEl    = document.getElementById('laptop-internals');
     const circuitEl      = document.getElementById('laptop-circuit');
     const terminalReveal = document.getElementById('terminal-reveal');
     const traceLines     = document.querySelectorAll('.cpu-trace');
     const circuitNodes   = document.querySelectorAll('.circuit-node');
     const heatmapEl      = document.getElementById('cpu-heatmap');
     const cpuLabel       = document.getElementById('cpu-label');
     const chipPins       = document.querySelectorAll('.chip-pin');
     const dataPackets    = document.querySelectorAll('.data-packet');
   
     if (!scene || !screenEl || !keyboardEl) return;
   
     // ── Master Timeline ──
     const tl = gsap.timeline({
       scrollTrigger: {
         trigger:    '#laptop-scene',
         start:      'top top',
         end:        'bottom bottom',
         scrub:      1.2,
         pin:        '.laptop-sticky',
         pinSpacing: true,
         anticipatePin: 1,
       }
     });
   
     // Phase 1 (0–20%): Laptop appears, gentle glow builds
     tl.fromTo('#laptop-wrapper',
       { scale: 0.75, opacity: 0, y: 40 },
       { scale: 1, opacity: 1, y: 0, duration: 1, ease: 'power2.out' },
       0
     );
   
     // Phase 2 (20–40%): Screen tilts slightly open — partial reveal
     tl.to(screenEl,
       { rotateX: -8, y: -10, duration: 0.8, ease: 'power1.inOut' },
       0.8
     );
   
     // Phase 3 (40–55%): Screen flies upward, keyboard slides down
     tl.to(screenEl,
       {
         y:       -280,
         rotateX: -35,
         scale:   0.92,
         opacity: 0.7,
         duration: 1.2,
         ease:    'power2.inOut'
       },
       1.6
     );
   
     tl.to(keyboardEl,
       {
         y:       180,
         rotateX: 15,
         scale:   0.94,
         opacity: 0.6,
         duration: 1.2,
         ease:    'power2.inOut'
       },
       1.6
     );
   
     // Phase 4 (55–65%): Internals fade in, circuit board appears
     tl.to(internalsEl,
       { opacity: 1, scale: 1, duration: 0.8, ease: 'power1.out' },
       2.4
     );
   
     // Phase 5 (65–75%): CPU traces light up sequentially
     if (traceLines.length) {
       traceLines.forEach((line, i) => {
         tl.fromTo(line,
           { strokeDashoffset: 500, opacity: 0 },
           { strokeDashoffset: 0,   opacity: 1, duration: 0.4, ease: 'none' },
           2.8 + i * 0.08
         );
       });
     }
   
     // Phase 6 (75–82%): Circuit nodes pulse in
     if (circuitNodes.length) {
       circuitNodes.forEach((node, i) => {
         tl.fromTo(node,
           { scale: 0, opacity: 0 },
           { scale: 1, opacity: 1, duration: 0.2, ease: 'back.out(2)' },
           3.2 + i * 0.05
         );
       });
     }
   
     // Phase 7 (82–88%): CPU heatmap and labels appear
     if (heatmapEl) {
       tl.fromTo(heatmapEl,
         { opacity: 0 },
         { opacity: 1, duration: 0.5 },
         3.5
       );
     }
   
     if (cpuLabel) {
       tl.fromTo(cpuLabel,
         { opacity: 0, y: 5 },
         { opacity: 1, y: 0, duration: 0.3 },
         3.7
       );
     }
   
     // Phase 8 (88–95%): Data packets travel along traces
     if (dataPackets.length) {
       dataPackets.forEach((pkt, i) => {
         tl.fromTo(pkt,
           { opacity: 0, motionPathProgress: 0 },
           { opacity: 1, duration: 0.6, ease: 'none' },
           3.8 + i * 0.1
         );
       });
     }
   
     // Phase 9 (95–100%): Terminal window rises from the void
     if (terminalReveal) {
       tl.fromTo(terminalReveal,
         { opacity: 0, y: 50, scale: 0.9 },
         { opacity: 1, y: 0,  scale: 1,   duration: 0.8, ease: 'power2.out' },
         4.2
       );
     }
   
     // Final: full parts disperse further for dramatic effect
     tl.to(screenEl,
       { y: -380, opacity: 0.35, rotateX: -50, duration: 0.8 },
       4.6
     );
     tl.to(keyboardEl,
       { y: 280, opacity: 0.35, rotateX: 25, duration: 0.8 },
       4.6
     );
   
     // ── Ambient glow parallax ──
     gsap.to('.laptop-glow', {
       scrollTrigger: {
         trigger: '#laptop-scene',
         start: 'top top',
         end:   'bottom bottom',
         scrub: 2
       },
       scale:   2.5,
       opacity: 0.15,
       ease:    'none'
     });
   
     // ── Chip pin animation on scroll ──
     if (chipPins.length) {
       chipPins.forEach((pin, i) => {
         gsap.to(pin, {
           scrollTrigger: {
             trigger: '#laptop-scene',
             start:   'top top',
             end:     'bottom bottom',
             scrub:   1
           },
           attr: { stroke: i % 2 === 0 ? '#00ff41' : '#00ffff' },
           opacity: 0.9,
           ease: 'none',
           delay: i * 0.02
         });
       });
     }
   
     // ── After-scene fade in for content below ──
     gsap.fromTo('.content-after-laptop',
       { opacity: 0, y: 60 },
       {
         opacity: 1, y: 0,
         scrollTrigger: {
           trigger: '.content-after-laptop',
           start:   'top 80%',
           end:     'top 40%',
           scrub:   1
         }
       }
     );
   });