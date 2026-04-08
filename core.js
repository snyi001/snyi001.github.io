/* ============================================================
   CORE.JS — Navigation, Utilities, IntersectionObserver
   ============================================================ */

   'use strict';

   const $ = (sel, ctx = document) => ctx.querySelector(sel);
   const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
   
   function initNav() {
     const nav = $('.nav');
     if (!nav) return;
   
     const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 50);
     window.addEventListener('scroll', onScroll, { passive: true });
     onScroll();
   
     const hamburger = $('.nav__hamburger');
     const mobileNav = $('.nav__mobile');
     if (hamburger && mobileNav) {
       hamburger.addEventListener('click', () => {
         const open = hamburger.classList.toggle('open');
         mobileNav.classList.toggle('open', open);
         document.body.style.overflow = open ? 'hidden' : '';
       });
       $$('a', mobileNav).forEach(a => {
         a.addEventListener('click', () => {
           hamburger.classList.remove('open');
           mobileNav.classList.remove('open');
           document.body.style.overflow = '';
         });
       });
     }
   
     const currentPath = window.location.pathname.replace(/\/$/, '');
     $$('.nav__links a, .nav__mobile a').forEach(a => {
       const href = (a.getAttribute('href') || '').replace(/\/$/, '');
       if (href && (href === currentPath || (href !== '/' && currentPath.startsWith(href)))) {
         a.classList.add('active');
       }
     });
   }
   
   function initScrollAnimations() {
     const observer = new IntersectionObserver((entries) => {
       entries.forEach(entry => {
         if (entry.isIntersecting) {
           entry.target.classList.add('animated');
           observer.unobserve(entry.target);
         }
       });
     }, { threshold: 0.15 });
   
     $$('.stagger-children').forEach(el => observer.observe(el));
   
     const fadeObserver = new IntersectionObserver((entries) => {
       entries.forEach(entry => {
         if (entry.isIntersecting) {
           entry.target.style.opacity = '1';
           entry.target.style.transform = 'translateY(0)';
           fadeObserver.unobserve(entry.target);
         }
       });
     }, { threshold: 0.1 });
   
     $$('[data-fade]').forEach(el => {
       el.style.opacity = '0';
       el.style.transform = 'translateY(24px)';
       el.style.transition = `opacity 0.6s ease ${el.dataset.delay || '0'}ms,
                              transform 0.6s ease ${el.dataset.delay || '0'}ms`;
       fadeObserver.observe(el);
     });
   }
   
   function initSkillBars() {
     const observer = new IntersectionObserver((entries) => {
       entries.forEach(entry => {
         if (entry.isIntersecting) {
           $$('.skill-bar__fill', entry.target).forEach(fill => {
             const pct = fill.dataset.pct;
             if (pct) setTimeout(() => { fill.style.width = pct + '%'; }, 200);
           });
           observer.unobserve(entry.target);
         }
       });
     }, { threshold: 0.3 });
   
     $$('.skills-grid, .skills-category').forEach(el => observer.observe(el));
   }
   
   function initCopyButtons() {
     $$('.code-block').forEach(block => {
       const btn = $('.code-block__copy', block);
       const code = $('pre', block);
       if (!btn || !code) return;
       btn.addEventListener('click', async () => {
         try {
           await navigator.clipboard.writeText(code.textContent);
           btn.textContent = 'Copied!';
           btn.style.color = 'var(--clr-green)';
           setTimeout(() => { btn.textContent = 'Copy'; btn.style.color = ''; }, 2000);
         } catch { btn.textContent = 'Failed'; }
       });
     });
   }
   
   function initProjectFilter() {
     const filterBtns = $$('.filter-btn');
     const cards      = $$('[data-category]');
     if (!filterBtns.length) return;
   
     filterBtns.forEach(btn => {
       btn.addEventListener('click', () => {
         filterBtns.forEach(b => b.classList.remove('active'));
         btn.classList.add('active');
         const cat = btn.dataset.filter;
   
         cards.forEach(card => {
           const show = cat === 'all' || card.dataset.category === cat;
           card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
           if (show) {
             card.style.opacity = '1';
             card.style.transform = 'scale(1)';
             card.style.display = '';
           } else {
             card.style.opacity = '0';
             card.style.transform = 'scale(0.95)';
             setTimeout(() => {
               if (card.style.opacity === '0') card.style.display = 'none';
             }, 300);
           }
         });
       });
     });
   }
   
   function initBlogSearch() {
     const input = $('.blog-search__input');
     const posts = $$('.blog-post-card');
     if (!input || !posts.length) return;
   
     input.addEventListener('input', () => {
       const q = input.value.toLowerCase().trim();
       posts.forEach(post => {
         const text = post.textContent.toLowerCase();
         post.style.display = (!q || text.includes(q)) ? '' : 'none';
       });
     });
   }
   
   function initTOC() {
     const tocLinks = $$('.post-toc__list a');
     if (!tocLinks.length) return;
   
     const headings = $$('.post-content h2, .post-content h3');
     const observer = new IntersectionObserver((entries) => {
       entries.forEach(entry => {
         if (entry.isIntersecting) {
           tocLinks.forEach(l => l.classList.remove('active'));
           const active = tocLinks.find(l => l.getAttribute('href') === '#' + entry.target.id);
           if (active) active.classList.add('active');
         }
       });
     }, { rootMargin: '-20% 0px -70% 0px' });
   
     headings.forEach(h => { if (h.id) observer.observe(h); });
   }
   
   function initReadingProgress() {
     if (!$('.post-content')) return;
     const bar = document.createElement('div');
     bar.style.cssText = `
       position: fixed; top: 0; left: 0; height: 2px; width: 0%;
       background: linear-gradient(90deg, var(--clr-green), var(--clr-cyan));
       z-index: 9999; transition: width 0.1s linear;
       box-shadow: 0 0 8px var(--clr-green);
     `;
     document.body.appendChild(bar);
   
     window.addEventListener('scroll', () => {
       const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
       const scrolled   = (window.scrollY / docHeight) * 100;
       bar.style.width  = Math.min(scrolled, 100) + '%';
     }, { passive: true });
   }
   
   function initGlitchRandom() {
     const els = $$('.glitch-text');
     if (!els.length) return;
     setInterval(() => {
       const el = els[Math.floor(Math.random() * els.length)];
       el.classList.add('glitch-active');
       setTimeout(() => el.classList.remove('glitch-active'),
         800 + Math.random() * 400);
     }, 3000 + Math.random() * 2000);
   }
   
   // ── Boot init ──
   document.addEventListener('DOMContentLoaded', () => {
     initNav();
     initScrollAnimations();
     initSkillBars();
     initCopyButtons();
     initProjectFilter();
     initBlogSearch();
     initTOC();
     initReadingProgress();
     initGlitchRandom();
   });