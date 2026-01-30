/**
 * Live Translator - Ultimate Android Fix (v4)
 * Uses strict overlap detection to remove duplicated words from Android speech engine
 */

class LiveTranslator {
    constructor() {
        this.recognition = null;
        this.isListening = false;

        // Settings
        this.lastFinalText = ""; // Keep track of the full last sentence

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
        this.closeWarning = document.getElementById('closeWarning');

        // Initial setup
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
        v.style.cssText = 'position: fixed; bottom: 5px; right: 5px; font-size: 10px; opacity: 0.5;';
        v.textContent = 'v4.0 (Android Fix)';
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
                    // CRITICAL FIX: Remove overlap with previous sentence
                    const cleanText = this.removeOverlap(this.lastFinalText, transcript);

                    if (cleanText.length > 0) {
                        this.processFinalSegment(cleanText);
                        this.lastFinalText = transcript; // Check against full raw transcript next time
                    }
                } else {
                    interim = transcript;
                }
            }
        };
    }

    // Magic function to detect repeated words from Android
    removeOverlap(prev, current) {
        if (!prev) return current;

        // Split into words
        const prevWords = prev.split(' ');
        const currWords = current.split(' ');

        // Check if current starts with the end of prev
        // Try to match the last N words of prev with first N of current
        const maxCheck = Math.min(prevWords.length, currWords.length, 5); // check up to 5 words overlap

        for (let i = maxCheck; i > 0; i--) {
            const suffix = prevWords.slice(-i).join(' ');
            const prefix = currWords.slice(0, i).join(' ');

            if (suffix === prefix) {
                // Formatting overlap found! Remove it from current
                return currWords.slice(i).join(' ');
            }
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
        // ... (loading indicator)
        const p = this.appendSegment(container, '...', 'loading-text');

        try {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ar|${lang}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.responseStatus === 200) {
                p.textContent = data.responseData.translatedText;
                p.className = 'final-text animate-in';
            }
        } catch (e) {
            p.textContent = "";
        }
        this.scrollToBottom();
    }

    appendSegment(container, text, cls) {
        const p = document.createElement('p');
        p.textContent = text;
        p.className = cls;
        container.appendChild(p);
        return p;
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
    }
}

document.addEventListener('DOMContentLoaded', () => new LiveTranslator());
