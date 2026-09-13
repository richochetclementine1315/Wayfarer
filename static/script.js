// =====================================================
// WAYFARER — Neo-Brutalist Frontend Script
// AccordionGallery + FlowingMenu + Chat Interface
// =====================================================

// Load GSAP from CDN (loaded in HTML head)
const gsap = window.gsap;

// ── ACCORDION GALLERY ─────────────────────────────────
class AccordionGallery {
    constructor(container, options = {}) {
        this.container = container;
        this.items = options.items || [];
        this.defaultIndex = options.defaultIndex ?? 2;
        this.expandRatio = options.expandRatio ?? 0.52;
        this.orientation = options.orientation ?? 'horizontal';
        this.duration = options.duration ?? 0.6;
        this.ease = options.ease ?? 'power3.out';
        this.parallax = options.parallax ?? 0.5;
        this.tilt = options.tilt ?? 8;
        this.stagger = options.stagger ?? 0.06;
        this.trigger = options.trigger ?? 'hover';
        this.showLabels = options.showLabels ?? true;
        this.grayscale = options.grayscale ?? true;
        this.height = options.height ?? 460;
        this.gap = options.gap ?? 10;
        this.radius = options.radius ?? 0;
        this.accentColor = options.accentColor ?? '#f5e642';
        this.overlayColor = options.overlayColor ?? '#060010';
        this.textColor = options.textColor ?? '#ffffff';

        this.count = this.items.length;
        this.active = Math.min(Math.max(this.defaultIndex, 0), this.count - 1);
        this.panelEls = [];
        this.mediaEls = [];
        this.barEls = [];
        this.textEls = [];
        this.tlRef = null;
        this.mediaSize = 320;
        this.firstRun = true;
        this.vertical = this.orientation === 'vertical';
        this.prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this._build();
        this._measure();
        this._bindEvents();

        const ro = new ResizeObserver(() => this._measure());
        ro.observe(this.container);
    }

    _build() {
        const { container, items, height, gap, vertical, accentColor, overlayColor, textColor, radius } = this;

        container.classList.add('accordion-gallery');
        if (vertical) container.classList.add('accordion-gallery--vertical');

        container.style.setProperty('--ag-accent', accentColor);
        container.style.setProperty('--ag-overlay', overlayColor);
        container.style.setProperty('--ag-text', textColor);
        container.style.setProperty('--ag-gap', `${gap}px`);
        container.style.setProperty('--ag-radius', `${radius}px`);
        container.style.height = vertical ? `${Math.round(height * 1.6)}px` : `${height}px`;
        container.setAttribute('role', 'list');
        container.setAttribute('aria-label', 'Image accordion gallery');

        items.forEach((item, i) => {
            const panel = document.createElement(item.link ? 'a' : 'div');
            if (item.link) panel.href = item.link;
            panel.className = `ag-panel${i === this.active ? ' ag-panel--active' : ''}`;
            panel.setAttribute('role', 'listitem');
            panel.setAttribute('tabindex', '0');
            panel.setAttribute('aria-label', item.label || '');
            if (i === this.active) panel.setAttribute('aria-current', 'true');

            panel.innerHTML = `
        <span class="ag-panel__frame">
          <span class="ag-panel__media">
            <img src="${item.image}" alt="${item.alt || item.label || ''}" draggable="false" loading="lazy" />
          </span>
          <span class="ag-panel__overlay" aria-hidden="true"></span>
        </span>
        ${this.showLabels ? `
          <span class="ag-panel__label" aria-hidden="true">
            <span class="ag-panel__bar"></span>
            <span class="ag-panel__text">${item.label || ''}</span>
          </span>` : ''}
      `;

            this.panelEls.push(panel);
            this.mediaEls.push(panel.querySelector('.ag-panel__media'));
            if (this.showLabels) {
                this.barEls.push(panel.querySelector('.ag-panel__bar'));
                this.textEls.push(panel.querySelector('.ag-panel__text'));
            } else {
                this.barEls.push(null);
                this.textEls.push(null);
            }

            container.appendChild(panel);
        });
    }

    _bindEvents() {
        this.panelEls.forEach((panel, i) => {
            if (this.trigger === 'hover') {
                panel.addEventListener('mouseenter', () => this._setActive(i));
            }
            panel.addEventListener('click', (e) => {
                if (i !== this.active) { e.preventDefault(); this._setActive(i); }
            });
            panel.addEventListener('focus', () => this._setActive(i));
            panel.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault(); this._setActive((i + 1) % this.count);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault(); this._setActive((i - 1 + this.count) % this.count);
                }
            });
        });
    }

    _setActive(i) {
        this.active = i;
        this.panelEls.forEach((p, idx) => {
            p.classList.toggle('ag-panel--active', idx === i);
            if (idx === i) p.setAttribute('aria-current', 'true');
            else p.removeAttribute('aria-current');
        });
        this._applyLayout(true);
    }

    _measure() {
        const rect = this.container.getBoundingClientRect();
        const total = this.vertical ? rect.height : rect.width;
        const usable = Math.max(total - this.gap * (this.count - 1), 120);
        const size = Math.max(140, usable * Math.min(Math.max(this.expandRatio, 0.2), 0.9) * 1.22);
        this.mediaSize = size;
        this.container.style.setProperty('--ag-media-size', `${size}px`);
        this._applyLayout(!this.firstRun);
        this.firstRun = false;
    }

    _applyLayout(animate) {
        const { active, count, expandRatio, duration, ease, vertical, tilt, parallax, grayscale, stagger, prefersReduced, mediaSize } = this;
        const r = Math.min(Math.max(expandRatio, 0.2), 0.9);
        const grow = count > 1 ? (r * (count - 1)) / (1 - r) : 1;
        const dur = animate && !prefersReduced ? duration : 0;

        if (this.tlRef) this.tlRef.kill();
        const tl = gsap.timeline();

        this.panelEls.forEach((panel, i) => {
            const isActive = i === active;
            const media = this.mediaEls[i];
            const bar = this.barEls[i];
            const text = this.textEls[i];
            const rot = isActive ? 0 : i < active ? tilt : -tilt;
            const rotProp = vertical ? { rotateX: -rot } : { rotateY: rot };

            tl.to(panel, { flexGrow: isActive ? grow : 1, ...rotProp, duration: dur, ease }, 0);

            if (media) {
                const drift = Math.max(-1.5, Math.min(1.5, active - i));
                const shift = drift * parallax * mediaSize * 0.06;
                const gray = grayscale ? (isActive ? 0 : 1) : 0;
                tl.to(media, {
                    xPercent: -50, yPercent: -50,
                    x: vertical ? 0 : isActive ? 0 : shift,
                    y: vertical ? (isActive ? 0 : shift) : 0,
                    '--ag-gray': gray,
                    '--ag-dim': isActive ? 0 : 0.35,
                    duration: dur, ease
                }, 0);
            }

            if (this.showLabels && bar && text) {
                if (isActive) {
                    tl.to([bar, text], { opacity: 1, x: 0, duration: dur, ease, stagger: prefersReduced ? 0 : stagger }, 0);
                } else {
                    tl.to([bar, text], { opacity: 0, x: -14, duration: dur * 0.6, ease }, 0);
                }
            }
        });

        this.tlRef = tl;
    }
}

// ── FLOWING MENU ──────────────────────────────────────
class FlowingMenu {
    constructor(container, options = {}) {
        this.container = container;
        this.items = options.items || [];
        this.speed = options.speed ?? 15;
        this.textColor = options.textColor ?? '#ffffff';
        this.bgColor = options.bgColor ?? '#120F17';
        this.marqueeBgColor = options.marqueeBgColor ?? '#f5e642';
        this.marqueeTextColor = options.marqueeTextColor ?? '#0c0c0c';
        this.borderColor = options.borderColor ?? '#ffffff';
        this._build();
    }

    _distMetric(x, y, x2, y2) {
        return (x - x2) ** 2 + (y - y2) ** 2;
    }

    _findClosestEdge(mouseX, mouseY, width, height) {
        const top = this._distMetric(mouseX, mouseY, width / 2, 0);
        const bot = this._distMetric(mouseX, mouseY, width / 2, height);
        return top < bot ? 'top' : 'bottom';
    }

    _build() {
        const wrap = this.container;
        wrap.classList.add('menu-wrap');
        wrap.style.backgroundColor = this.bgColor;

        const nav = document.createElement('nav');
        nav.className = 'menu';
        wrap.appendChild(nav);

        this.items.forEach(item => {
            const mi = this._buildItem(item);
            nav.appendChild(mi);
        });
    }

    _buildItem(item) {
        const { speed, textColor, marqueeBgColor, marqueeTextColor, borderColor } = this;
        const el = document.createElement('div');
        el.className = 'menu__item';
        el.style.borderColor = borderColor;

        const link = document.createElement('a');
        link.className = 'menu__item-link';
        link.href = item.link || '#';
        link.textContent = item.text;
        link.style.color = textColor;

        // Marquee
        const marqueeEl = document.createElement('div');
        marqueeEl.className = 'marquee';
        marqueeEl.style.backgroundColor = marqueeBgColor;

        const innerWrap = document.createElement('div');
        innerWrap.className = 'marquee__inner-wrap';

        const inner = document.createElement('div');
        inner.className = 'marquee__inner';
        inner.setAttribute('aria-hidden', 'true');

        const buildPart = () => {
            const part = document.createElement('div');
            part.className = 'marquee__part';
            part.style.color = marqueeTextColor;
            const span = document.createElement('span');
            span.textContent = item.text;
            const img = document.createElement('div');
            img.className = 'marquee__img';
            img.style.backgroundImage = `url(${item.image})`;
            part.appendChild(span);
            part.appendChild(img);
            return part;
        };

        // Add enough parts
        for (let i = 0; i < 8; i++) inner.appendChild(buildPart());
        innerWrap.appendChild(inner);
        marqueeEl.appendChild(innerWrap);
        el.appendChild(link);
        el.appendChild(marqueeEl);

        const animationDefaults = { duration: 0.6, ease: 'expo.out' };
        let anim = null;

        const startMarquee = () => {
            const part = inner.querySelector('.marquee__part');
            if (!part) return;
            const cw = part.offsetWidth;
            if (!cw) return;
            if (anim) anim.kill();
            anim = gsap.to(inner, { x: -cw, duration: speed, ease: 'none', repeat: -1 });
        };

        setTimeout(startMarquee, 80);
        window.addEventListener('resize', startMarquee);

        link.addEventListener('mouseenter', (ev) => {
            const rect = el.getBoundingClientRect();
            const edge = this._findClosestEdge(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height);
            gsap.timeline({ defaults: animationDefaults })
                .set(marqueeEl, { y: edge === 'top' ? '-101%' : '101%' }, 0)
                .set(inner, { y: edge === 'top' ? '101%' : '-101%' }, 0)
                .to([marqueeEl, inner], { y: '0%' }, 0);
        });

        link.addEventListener('mouseleave', (ev) => {
            const rect = el.getBoundingClientRect();
            const edge = this._findClosestEdge(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height);
            gsap.timeline({ defaults: animationDefaults })
                .to(marqueeEl, { y: edge === 'top' ? '-101%' : '101%' }, 0)
                .to(inner, { y: edge === 'top' ? '101%' : '-101%' }, 0);
        });

        return el;
    }
}

// ── CHAT INTERFACE ────────────────────────────────────
class WayfarerChat {
    constructor() {
        this.messages = document.getElementById('chatMessages');
        this.input = document.getElementById('chatInput');
        this.sendBtn = document.getElementById('chatSend');
        this.threadId = null;
        this.isLoading = false;

        this._bind();
        this._welcome();
    }

    _bind() {
        this.sendBtn.addEventListener('click', () => this._send());
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._send(); }
        });
        this.input.addEventListener('input', () => {
            this.input.style.height = 'auto';
            this.input.style.height = Math.min(this.input.scrollHeight, 120) + 'px';
        });
    }

    _welcome() {
        const samples = [
            'Plan a 7-day trip to Tokyo under $2000',
            'Find flights from NYC to Paris next month',
            'Best hotels in Bali for a honeymoon',
            'Weekend itinerary for Rome'
        ];
        const sampleChips = document.getElementById('sampleChips');
        if (sampleChips) {
            samples.forEach(s => {
                const chip = document.createElement('button');
                chip.className = 'btn';
                chip.style.cssText = 'font-size:0.65rem;padding:0.5rem 1rem;margin:0.25rem;box-shadow:2px 2px 0 #fff;';
                chip.textContent = s;
                chip.addEventListener('click', () => { this.input.value = s; this._send(); });
                sampleChips.appendChild(chip);
            });
        }
    }

    _timestamp() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    _addMessage(role, content) {
        const wrapper = document.createElement('div');
        wrapper.className = `chat-message chat-message--${role}`;

        const meta = document.createElement('div');
        meta.className = 'chat-meta';
        meta.textContent = role === 'user' ? `You · ${this._timestamp()}` : `Wayfarer AI · ${this._timestamp()}`;

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.textContent = content;

        wrapper.appendChild(meta);
        wrapper.appendChild(bubble);
        this.messages.appendChild(wrapper);
        this._scroll();
        return wrapper;
    }

    _addCards(data) {
        const { answer, flight_results, hotel_results, itinerary } = data;
        const wrapper = document.createElement('div');
        wrapper.className = 'chat-message chat-message--bot';
        wrapper.style.animation = 'msgSlideIn 0.3s ease both';

        const meta = document.createElement('div');
        meta.className = 'chat-meta';
        meta.textContent = `Wayfarer AI · ${this._timestamp()}`;
        wrapper.appendChild(meta);

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.textContent = answer;
        wrapper.appendChild(bubble);

        const cards = document.createElement('div');
        cards.className = 'chat-cards';

        if (flight_results && flight_results.trim()) {
            cards.appendChild(this._card('✈ Flight Options', flight_results));
        }
        if (hotel_results && hotel_results.trim()) {
            cards.appendChild(this._card('🏨 Hotel Options', hotel_results));
        }
        if (itinerary && itinerary.trim()) {
            cards.appendChild(this._card('📋 Itinerary', itinerary));
        }

        wrapper.appendChild(cards);
        this.messages.appendChild(wrapper);
        this._scroll();
    }

    _card(title, body) {
        const card = document.createElement('div');
        card.className = 'result-card';
        const t = document.createElement('div');
        t.className = 'result-card-title';
        t.textContent = title;
        const b = document.createElement('div');
        b.className = 'result-card-body';
        b.textContent = body;
        card.appendChild(t);
        card.appendChild(b);
        return card;
    }

    _showTyping() {
        const el = document.createElement('div');
        el.className = 'chat-typing';
        el.id = 'typingIndicator';
        el.innerHTML = `
      <div class="chat-typing-bubble">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>`;
        this.messages.appendChild(el);
        this._scroll();
    }

    _hideTyping() {
        const el = document.getElementById('typingIndicator');
        if (el) el.remove();
    }

    _scroll() {
        this.messages.scrollTop = this.messages.scrollHeight;
    }

    _setLoading(v) {
        this.isLoading = v;
        this.sendBtn.disabled = v;
        this.sendBtn.textContent = v ? 'Thinking...' : 'Send →';
    }

    async _send() {
        const msg = this.input.value.trim();
        if (!msg || this.isLoading) return;

        this.input.value = '';
        this.input.style.height = 'auto';
        this._addMessage('user', msg);
        this._setLoading(true);
        this._showTyping();

        try {
            const res = await fetch('/api/travel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg, thread_id: this.threadId })
            });

            const data = await res.json();
            this._hideTyping();

            if (data.success) {
                this.threadId = data.thread_id;
                this._addCards(data);
            } else {
                this._addMessage('bot', `Error: ${data.error || 'Something went wrong.'}`);
            }
        } catch (e) {
            this._hideTyping();
            this._addMessage('bot', 'Network error. Please try again.');
        }

        this._setLoading(false);
    }
}

// ── TEXT ANIMATIONS ───────────────────────────────────
function animateHeroText() {
    const lines = document.querySelectorAll('.hero-title .line span');
    if (!lines.length) return;
    gsap.from(lines, {
        yPercent: 110,
        duration: 0.9,
        ease: 'power4.out',
        stagger: 0.12,
    });
}

function initScrollAnimations() {
    const els = document.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                gsap.from(entry.target, {
                    opacity: 0,
                    y: 30,
                    duration: 0.7,
                    ease: 'power3.out'
                });
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    els.forEach(el => observer.observe(el));
}

// Counter animation for stats
function animateStats() {
    const counters = document.querySelectorAll('[data-count]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseFloat(el.dataset.count);
                const suffix = el.dataset.suffix || '';
                const prefix = el.dataset.prefix || '';
                gsap.fromTo({ val: 0 }, { val: target }, {
                    duration: 1.8,
                    ease: 'power2.out',
                    onUpdate: function () {
                        el.textContent = prefix + (target % 1 ? this.targets()[0].val.toFixed(1) : Math.floor(this.targets()[0].val)) + suffix;
                    }
                });
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });
    counters.forEach(el => observer.observe(el));
}

// ── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Wait for GSAP
    if (!window.gsap) { console.warn('GSAP not loaded'); return; }

    // Hero text animation
    animateHeroText();
    initScrollAnimations();
    animateStats();

    // Accordion Gallery
    const agEl = document.getElementById('accordionGallery');
    if (agEl) {
        new AccordionGallery(agEl, {
            items: [
                { image: 'https://picsum.photos/id/1015/900/1200', label: 'Canyon', link: '#' },
                { image: 'https://picsum.photos/id/1018/900/1200', label: 'Ridgeline', link: '#' },
                { image: 'https://picsum.photos/id/1039/900/1200', label: 'Falls', link: '#' },
                { image: 'https://picsum.photos/id/1043/900/1200', label: 'Harbour', link: '#' },
                { image: 'https://picsum.photos/id/1044/900/1200', label: 'Skyline', link: '#' }
            ],
            defaultIndex: 2,
            expandRatio: 0.52,
            trigger: 'hover',
            accentColor: '#f5e642',
            overlayColor: '#060010',
            textColor: '#ffffff',
            grayscale: true,
            showLabels: true,
            duration: 0.6,
            ease: 'power3.out',
            parallax: 0.5,
            tilt: 8,
            stagger: 0.06,
            height: 460,
            gap: 2,
            radius: 0,
            orientation: 'horizontal'
        });
    }

    // Flowing Menu
    const fmEl = document.getElementById('flowingMenu');
    if (fmEl) {
        new FlowingMenu(fmEl, {
            items: [
                { link: '#destinations', text: 'Destinations', image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&h=400&fit=crop&auto=format' },
                { link: '#flights', text: 'Flights', image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop&auto=format' },
                { link: '#hotels', text: 'Hotels', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&auto=format' },
                { link: '#itineraries', text: 'Itineraries', image: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=600&h=400&fit=crop&auto=format' }
            ],
            speed: 18,
            textColor: '#ffffff',
            bgColor: '#111111',
            marqueeBgColor: '#f5e642',
            marqueeTextColor: '#0c0c0c',
            borderColor: '#ffffff'
        });
    }

    // Chat
    if (document.getElementById('chatMessages')) {
        new WayfarerChat();
    }

    // Nav active scroll highlight
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');
    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                navLinks.forEach(l => {
                    l.style.color = l.getAttribute('href') === `#${e.target.id}` ? 'var(--accent)' : '';
                });
            }
        });
    }, { threshold: 0.4 });
    sections.forEach(s => io.observe(s));
});