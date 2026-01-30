/**
 * Live Translator - V8 High Quality Translation
 * Switched to Google Translate Engine (GTX) for better accuracy
 */

class LiveTranslator {
    constructor() {
        this.recognition = null;
        this.isListening = false;

        this.lastAddedText = "";
        this.lastAddTimestamp = 0;

        // DOM Elements
        this.micButton = document.getElementById('micButton');
        this.micLabel = document.getElementById('micLabel');
        this.liveIndicator = document.getElementById('liveIndicator');

        this.originalContainer = document.getElementById('originalText');
        this.englishContainer = document.getElementById('englishText');
        this.frenchContainer = document.getElementById('frenchText');
        this.chineseContainer = document.getElementById('chineseText');

        this.clearBtn = document.getElementById('clearBtn');
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
        v.style.cssText = 'position: fixed; bottom: 5px; right: 5px; font-size: 10px; opacity: 0.5; color: green; font-weight: 900;';
        v.textContent = 'v8.0 (Google Engine)';
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
                setTimeout(() => { try { this.recognition.start(); } catch (e) { } }, 50);
            } else {
                this.micButton.classList.remove('listening');
                this.micLabel.textContent = 'اضغط للبدء';
                this.liveIndicator.classList.remove('active');
            }
        };

        this.recognition.onresult = (event) => {
            let interim = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                let transcript = event.results[i][0].transcript.trim();

                if (event.results[i].isFinal) {
                    this.handleNuclearResult(transcript);
                } else {
                    interim = transcript;
                }
            }

            this.updateInterimDisplay(interim);
        };
    }

    handleNuclearResult(rawText) {
        if (!rawText) return;

        const now = Date.now();
        if (now - this.lastAddTimestamp < 100 && rawText === this.lastAddedText) return;

        const normalize = (str) => str.replace(/[^\u0621-\u064A0-9a-zA-Z]/g, '');
        const prevNorm = normalize(this.lastAddedText);
        const currNorm = normalize(rawText);

        if (prevNorm.endsWith(currNorm)) return;

        let cleanText = rawText;
        const oldWords = this.lastAddedText.split(/\s+/);
        const newWords = rawText.split(/\s+/);

        const maxCheck = Math.min(oldWords.length, newWords.length, 10);

        for (let i = maxCheck; i > 0; i--) {
            const suffix = oldWords.slice(-i).join(' ');
            const prefix = newWords.slice(0, i).join(' ');

            if (normalize(suffix) === normalize(prefix)) {
                cleanText = newWords.slice(i).join(' ');
                break;
            }
        }

        if (!cleanText.trim()) return;

        this.lastAddedText = rawText;
        this.lastAddTimestamp = now;
        this.processFinalSegment(cleanText);
    }

    async processFinalSegment(text) {
        this.appendSegment(this.originalContainer, text, 'final-text');

        // Translate using Google Engine
        this.translateAndAppend(text, 'en', this.englishContainer);
        this.translateAndAppend(text, 'fr', this.frenchContainer);
        this.translateAndAppend(text, 'zh-CN', this.chineseContainer); // Google uses zh-CN

        this.scrollToBottom();
    }

    async translateAndAppend(text, lang, container) {
        try {
            // Using Google Translate API (GTX)
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;

            const res = await fetch(url);
            const data = await res.json();

            // Google returns array of segments: [[["Hello", "مرحبا", ...], ["World", "العالم", ...]]]
            if (data && data[0]) {
                const combinedText = data[0].map(segment => segment[0]).join('');
                if (combinedText) {
                    this.appendSegment(container, combinedText, 'final-text');
                }
            }
        } catch (e) {
            console.error(e);
        }
        this.scrollToBottom();
    }

    appendSegment(container, text, cls) {
        let mainP = container.querySelector('.main-paragraph');
        if (!mainP) {
            mainP = document.createElement('div');
            mainP.className = 'main-paragraph';
            const interim = container.querySelector('.interim-wrapper');
            if (interim) container.insertBefore(mainP, interim);
            else container.appendChild(mainP);
        }

        const span = document.createElement('span');
        span.textContent = " " + text;
        span.className = cls;
        mainP.appendChild(span);
        return span;
    }

    updateInterimDisplay(text) {
        this.ensureInterimWrappers();
        if (text === this.lastAddedText) {
            this.interimElements.original.textContent = "";
        } else {
            this.interimElements.original.textContent = text ? " " + text : "";
        }
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
        div.style.display = 'inline';
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
        this.lastAddedText = "";
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
    }
}

document.addEventListener('DOMContentLoaded', () => new LiveTranslator());
