/* ============================================================
   TYPEWRITER.JS — Terminal Typewriter Effect
   ============================================================ */

   'use strict';

   class Typewriter {
     constructor(element, options = {}) {
       this.el       = typeof element === 'string'
                       ? document.querySelector(element) : element;
       if (!this.el) return;
   
       this.opts = {
         speed:      options.speed      ?? 60,
         deleteSpeed:options.deleteSpeed?? 35,
         pauseAfter: options.pauseAfter ?? 1800,
         pauseBefore:options.pauseBefore?? 400,
         loop:       options.loop       ?? true,
         cursor:     options.cursor     ?? true,
         onDone:     options.onDone     ?? null,
       };
   
       this.queue   = [];
       this.running = false;
       this.charIdx = 0;
   
       if (this.opts.cursor) this._addCursor();
     }
   
     _addCursor() {
       this.cursor = document.createElement('span');
       this.cursor.className = 'terminal__cursor';
       this.cursor.setAttribute('aria-hidden', 'true');
       this.el.parentNode.insertBefore(this.cursor, this.el.nextSibling);
     }
   
     type(text) {
       this.queue.push({ action: 'type', text });
       return this;
     }
   
     delete(count) {
       this.queue.push({ action: 'delete', count: count ?? 'all' });
       return this;
     }
   
     pause(ms) {
       this.queue.push({ action: 'pause', ms: ms ?? this.opts.pauseAfter });
       return this;
     }
   
     clear() {
       this.queue.push({ action: 'clear' });
       return this;
     }
   
     start() {
       if (!this.running) {
         this.running = true;
         this._processQueue();
       }
       return this;
     }
   
     async _processQueue() {
       const items = this.opts.loop
         ? this.queue
         : [...this.queue];
   
       while (true) {
         for (const item of items) {
           await this._process(item);
         }
         if (!this.opts.loop) break;
         if (this.opts.onDone) this.opts.onDone();
       }
       this.running = false;
     }
   
     _process(item) {
       return new Promise(resolve => {
         switch (item.action) {
           case 'type':   this._typeText(item.text, resolve);   break;
           case 'delete': this._deleteText(item.count, resolve);break;
           case 'pause':  setTimeout(resolve, item.ms);         break;
           case 'clear':  this.el.textContent = ''; resolve();  break;
           default:       resolve();
         }
       });
     }
   
     _typeText(text, done) {
       let i = 0;
       const tick = () => {
         if (i < text.length) {
           this.el.textContent += text[i++];
           setTimeout(tick, this.opts.speed + (Math.random() * 30 - 15));
         } else {
           setTimeout(done, this.opts.pauseBefore);
         }
       };
       tick();
     }
   
     _deleteText(count, done) {
       const target = count === 'all' ? 0
         : Math.max(0, this.el.textContent.length - count);
   
       const tick = () => {
         if (this.el.textContent.length > target) {
           this.el.textContent = this.el.textContent.slice(0, -1);
           setTimeout(tick, this.opts.deleteSpeed);
         } else {
           done();
         }
       };
       tick();
     }
   }
   
   // ── Auto-init from data attributes ──
   document.addEventListener('DOMContentLoaded', () => {
     // Single typewriter elements
     document.querySelectorAll('[data-typewriter]').forEach(el => {
       const texts  = el.dataset.typewriter.split('|');
       const speed  = parseInt(el.dataset.twSpeed  ?? 70);
       const loop   = el.dataset.twLoop !== 'false';
       const tw     = new Typewriter(el, { speed, loop });
       texts.forEach((t, i) => {
         tw.type(t);
         if (texts.length > 1) tw.pause(1600).delete('all').pause(300);
       });
       tw.start();
     });
   
     // Hero role typewriter
     const heroRole = document.getElementById('hero-role-text');
     if (heroRole) {
       new Typewriter(heroRole, { speed: 65, loop: true, pauseAfter: 2000 })
         .type('Security Researcher')
         .pause(2000)
         .delete('all')
         .pause(400)
         .type('Reverse Engineer')
         .pause(2000)
         .delete('all')
         .pause(400)
         .type('Cryptography Enthusiast')
         .pause(2000)
         .delete('all')
         .pause(400)
         .type('CTF Player')
         .pause(2000)
         .delete('all')
         .pause(400)
         .start();
     }
   
     // Terminal body typewriter
     const terminalEl = document.getElementById('terminal-typewriter');
     if (terminalEl) {
       const lines = [
         '> Initializing system...',
         '> Loading modules: [crypto] [rev-eng] [net-sec]',
         '> All systems operational.',
         '> Welcome, operator.',
       ];
       let lineIndex = 0;
   
       function typeNextLine() {
         if (lineIndex >= lines.length) return;
         const line   = document.createElement('div');
         line.className = 'terminal__line';
         terminalEl.appendChild(line);
   
         new Typewriter(line, { speed: 45, loop: false, cursor: false })
           .type(lines[lineIndex])
           .start();
   
         lineIndex++;
         if (lineIndex < lines.length) {
           setTimeout(typeNextLine, lines[lineIndex - 1].length * 50 + 600);
         }
       }
   
       // Trigger when visible
       const obs = new IntersectionObserver(entries => {
         entries.forEach(e => {
           if (e.isIntersecting) { typeNextLine(); obs.disconnect(); }
         });
       }, { threshold: 0.5 });
       obs.observe(terminalEl);
     }
   });
   
   // Export for manual use
   window.Typewriter = Typewriter;