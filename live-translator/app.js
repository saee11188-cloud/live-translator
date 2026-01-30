/**
 * Live Translator - V5 Continuous Flow
 * Renders text as a single continuous paragraph instead of separate lines
 */

class LiveTranslator {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.lastFinalText = "";

        // DOM Elements
        this.micButton = document.getElementById('micButton');
        this.micLabel = document.getElementById('micLabel');
        this.liveIndicator = document.getElementById('liveIndicator');

        this.originalContainer = document.getElementById('originalText');
        this.englishContainer = document.getElementById('englishText');
        this.frenchContainer = document.getElementById('frenchText');
        this.chineseContainer = document.getElementById('chineseText');

        this.clearBtn = document.getElementById('clearBtn');
        this.toast = document.getElementById('toast');
        this.warningModal = document.getElementById('warningModal');

        this.init();
    }

    init() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.warningModal.classList.add('show');
            return;
        }

        this.clearAll();
        this.setupSpeechRecognition();
        this.setupEventListeners();
        this.showVersion();
    }

    showVersion() {
        const v = document.createElement('div');
        v.style.cssText = 'position: fixed; bottom: 5px; right: 5px; font-size: 10px; opacity: 0.5; pointer-events: none;';
        v.textContent = 'v5.0 (Continuous)';
        document.body.appendChild(v);
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'ar-SA';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.micButton.classList.add('listening');
            this.micLabel.textContent = '...';
            this.liveIndicator.classList.add('active');
        };

        this.recognition.onend = () => {
            if (this.isListening) {
                setTimeout(() => { try { this.recognition.start(); } catch (e) { } }, 100);
            } else {
                this.micButton.classList.remove('listening');
                this.micLabel.textContent = 'اضغط للبدء';
                this.liveIndicator.classList.remove('active');
            }
        };

        this.recognition.onresult = (event) => {
            let interim = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                let transcript = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    transcript = transcript.trim();
                    const cleanText = this.removeOverlap(this.lastFinalText, transcript);

                    if (cleanText.length > 0) {
                        this.processFinalSegment(cleanText);
                        this.lastFinalText = transcript;
                    }
                } else {
                    interim = transcript;
                }
            }

            this.updateInterimDisplay(interim);
        };
    }

    removeOverlap(prev, current) {
        if (!prev) return current;
        const prevWords = prev.split(' ');
        const currWords = current.split(' ');
        const maxCheck = Math.min(prevWords.length, currWords.length, 5);

        for (let i = maxCheck; i > 0; i--) {
            const suffix = prevWords.slice(-i).join(' ');
            const prefix = currWords.slice(0, i).join(' ');
            if (suffix === prefix) return currWords.slice(i).join(' ');
        }
        return current;
    }

    async processFinalSegment(text) {
        if (!text.trim()) return;

        this.appendSegment(this.originalContainer, text, 'final-text');

        // Translate
        this.translateAndAppend(text, 'en', this.englishContainer);
        this.translateAndAppend(text, 'fr', this.frenchContainer);
        this.translateAndAppend(text, 'zh', this.chineseContainer);

        this.scrollToBottom();
    }

    async translateAndAppend(text, lang, container) {
        // Placeholder span
        const span = this.appendSegment(container, '...', 'loading-text');

        try {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ar|${lang}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.responseStatus === 200) {
                span.textContent = " " + data.responseData.translatedText;
                span.className = 'final-text animate-in';
            } else {
                span.style.display = 'none'; // Hide if failed
            }
        } catch (e) {
            span.style.display = 'none';
        }
        this.scrollToBottom();
    }

    appendSegment(container, text, cls) {
        // Main Paragraph Container logic
        let mainP = container.querySelector('.main-paragraph');
        if (!mainP) {
            mainP = document.createElement('div');
            mainP.className = 'main-paragraph';
            // Insert before interim wrapper if exists
            const interim = container.querySelector('.interim-wrapper');
            if (interim) container.insertBefore(mainP, interim);
            else container.appendChild(mainP);
        }

        const span = document.createElement('span');
        // Add a space before new text for continuity
        span.textContent = " " + text;
        span.className = cls;
        mainP.appendChild(span);

        return span;
    }

    updateInterimDisplay(text) {
        this.ensureInterimWrappers();
        this.interimElements.original.textContent = text ? " " + text : "";
        this.scrollToBottom();
    }

    ensureInterimWrappers() {
        if (!this.originalContainer.querySelector('.interim-wrapper')) {
            this.interimElements = {
                original: this.createInterimWrapper(this.originalContainer),
                en: this.createInterimWrapper(this.englishContainer),
                fr: this.createInterimWrapper(this.frenchContainer),
                zh: this.createInterimWrapper(this.chineseContainer)
            };
        }
    }

    createInterimWrapper(container) {
        const div = document.createElement('div');
        div.className = 'interim-wrapper';
        div.style.display = 'inline'; // Make it flow with text
        const span = document.createElement('span');
        span.className = 'interim-text';
        div.appendChild(span);
        container.appendChild(div);
        return span;
    }

    scrollToBottom() {
        [this.originalContainer, this.englishContainer, this.frenchContainer, this.chineseContainer]
            .forEach(el => el.scrollTop = el.scrollHeight);
    }

    clearAll() {
        this.lastFinalText = "";
        const reset = (c) => c.innerHTML = '';
        reset(this.originalContainer);
        reset(this.englishContainer);
        reset(this.frenchContainer);
        reset(this.chineseContainer);
    }

    setupEventListeners() {
        this.micButton.addEventListener('click', () => {
            if (this.isListening) {
                this.isListening = false;
                this.recognition.stop();
            } else {
                this.recognition.start();
            }
        });
        this.clearBtn.addEventListener('click', () => this.clearAll());

        // Logic for Copy/Speak buttons updated to get ALL text
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.currentTarget.dataset.lang;
                let c = lang === 'en' ? this.englishContainer : lang === 'fr' ? this.frenchContainer : this.chineseContainer;
                navigator.clipboard.writeText(c.innerText);
                this.showToast('تم النسخ');
            });
        });

        document.querySelectorAll('.speak-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.currentTarget.dataset.lang;
                let c = lang.includes('en') ? this.englishContainer : lang.includes('fr') ? this.frenchContainer : this.chineseContainer;
                const u = new SpeechSynthesisUtterance(c.innerText);
                u.lang = lang;
                speechSynthesis.speak(u);
            });
        });
    }

    showToast(msg) {
        // ... same toast logic
    }
}

document.addEventListener('DOMContentLoaded', () => new LiveTranslator());
