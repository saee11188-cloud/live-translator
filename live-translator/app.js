/**
 * Live Translator - V7 NUCLEAR DE-DUPLICATION
 * Uses 3 layers of filtering to kill duplicates dead.
 */

class LiveTranslator {
    constructor() {
        this.recognition = null;
        this.isListening = false;

        this.lastAddedText = ""; // Full text of the last successfully added segment
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
        v.style.cssText = 'position: fixed; bottom: 5px; right: 5px; font-size: 10px; opacity: 0.5; color: red; font-weight: 900;';
        v.textContent = 'v7.0 (NUCLEAR)';
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
        // FILTER 1: Time Gating (Ignore duplicated fast-fire events)
        if (now - this.lastAddTimestamp < 100 && rawText === this.lastAddedText) {
            console.log("Blocked by Time Gate");
            return;
        }

        // FILTER 2: Normalization Check
        // Remove spaces and punctuation to compare raw content
        const normalize = (str) => str.replace(/[^\u0621-\u064A0-9a-zA-Z]/g, '');
        const prevNorm = normalize(this.lastAddedText);
        const currNorm = normalize(rawText);

        // Check if current is fully contained at the end of previous
        if (prevNorm.endsWith(currNorm)) {
            console.log("Blocked by Full Containment");
            return;
        }

        // FILTER 3: Overlap Removal (The Surgical Cut)
        // Check if the new text starts with the *end* of the old text
        let cleanText = rawText;

        // Split by words
        const oldWords = this.lastAddedText.split(/\s+/);
        const newWords = rawText.split(/\s+/);

        // Check overlap up to 10 words
        let overlapFound = false;
        const maxCheck = Math.min(oldWords.length, newWords.length, 10);

        for (let i = maxCheck; i > 0; i--) {
            const suffix = oldWords.slice(-i).join(' ');
            const prefix = newWords.slice(0, i).join(' ');

            // Loose comparison (ignore exact punctuation in overlap)
            if (normalize(suffix) === normalize(prefix)) {
                // Cut the overlap
                cleanText = newWords.slice(i).join(' ');
                overlapFound = true;
                break;
            }
        }

        if (!cleanText.trim()) return; // Nothing left after cleaning

        // Log success
        this.lastAddedText = rawText; // Store raw for next comparison
        this.lastAddTimestamp = now;
        this.processFinalSegment(cleanText);
    }

    async processFinalSegment(text) {
        this.appendSegment(this.originalContainer, text, 'final-text');

        // Translate NO-WAIT (Fire and forget)
        this.translateAndAppend(text, 'en', this.englishContainer);
        this.translateAndAppend(text, 'fr', this.frenchContainer);
        this.translateAndAppend(text, 'zh', this.chineseContainer);

        this.scrollToBottom();
    }

    async translateAndAppend(text, lang, container) {
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
        // Don't show interim if it looks exactly like what we just added
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
