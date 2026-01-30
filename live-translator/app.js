/**
 * Live Translator - V6 STRICT FIXED
 * Forces strict de-duplication by checking on-screen text
 */

class LiveTranslator {
    constructor() {
        this.recognition = null;
        this.isListening = false;

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
        v.style.cssText = 'position: fixed; bottom: 5px; right: 5px; font-size: 10px; opacity: 0.5; pointer-events: none; color: red; font-weight: bold;';
        v.textContent = 'v6.0 (STRICT FIX)';
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
                    // STRICT CHECK:
                    // Get current text on screen
                    const currentScreenText = this.originalContainer.innerText;

                    // If transcript is ALREADY at the end of screen text, IGNORE IT COMPLETELY
                    if (currentScreenText.endsWith(transcript)) {
                        console.log("Ignored duplicate: " + transcript);
                        continue;
                    }

                    // Remove overlap
                    const cleanText = this.removeOverlapStr(currentScreenText, transcript);

                    if (cleanText.length > 0) {
                        this.processFinalSegment(cleanText);
                    }
                } else {
                    interim = transcript;
                }
            }

            this.updateInterimDisplay(interim);
        };
    }

    // Check if 'newText' starts with the ending of 'currentText'
    removeOverlapStr(currentText, newText) {
        if (!currentText || !newText) return newText;

        // Normalize
        const c = currentText.trim().split(' ');
        const n = newText.trim().split(' ');

        // Look for overlap of up to 10 words
        const maxCheck = Math.min(c.length, n.length, 10);

        for (let i = maxCheck; i > 0; i--) {
            const suffix = c.slice(-i).join(' ');
            const prefix = n.slice(0, i).join(' ');

            if (suffix === prefix) {
                // Found overlap! Return only the NEW part
                return n.slice(i).join(' ');
            }
        }

        return newText;
    }

    async processFinalSegment(text) {
        if (!text.trim()) return;

        this.appendSegment(this.originalContainer, text, 'final-text');

        this.translateAndAppend(text, 'en', this.englishContainer);
        this.translateAndAppend(text, 'fr', this.frenchContainer);
        this.translateAndAppend(text, 'zh', this.chineseContainer);

        this.scrollToBottom();
    }

    async translateAndAppend(text, lang, container) {
        // Skip placeholder for speed in continuous mode
        try {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ar|${lang}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.responseStatus === 200) {
                this.appendSegment(container, data.responseData.translatedText, 'final-text');
            }
        } catch (e) { }
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
