/**
 * Live Translator - Robust Long Speech Version
 * Handles infinite speech by processing segments individually
 */

class LiveTranslator {
    constructor() {
        this.recognition = null;
        this.isListening = false;

        // Settings
        this.targetLanguages = ['en', 'fr', 'zh'];
        this.lastProcessedText = '';

        // DOM Elements
        this.micButton = document.getElementById('micButton');
        this.micLabel = document.getElementById('micLabel');
        this.liveIndicator = document.getElementById('liveIndicator');

        // Containers for appending text segments
        this.originalContainer = document.getElementById('originalText');
        this.englishContainer = document.getElementById('englishText');
        this.frenchContainer = document.getElementById('frenchText');
        this.chineseContainer = document.getElementById('chineseText');

        this.clearBtn = document.getElementById('clearBtn');
        this.toast = document.getElementById('toast');
        this.warningModal = document.getElementById('warningModal');
        this.closeWarning = document.getElementById('closeWarning');

        // Interim text elements (for showing what is being said right now)
        this.interimElements = {
            original: null,
            en: null,
            fr: null,
            zh: null
        };

        this.init();
    }

    init() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.warningModal.classList.add('show');
            this.closeWarning.addEventListener('click', () => this.warningModal.classList.remove('show'));
            return;
        }

        // Clear initial placeholders
        this.clearAll();

        this.setupSpeechRecognition();
        this.setupEventListeners();
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
            this.micLabel.textContent = 'اضغط للإيقاف';
            this.liveIndicator.classList.add('active');
        };

        this.recognition.onend = () => {
            if (this.isListening) {
                // Instantly restart to simulate infinite listening
                this.recognition.start();
            } else {
                this.micButton.classList.remove('listening');
                this.micLabel.textContent = 'اضغط للبدء';
                this.liveIndicator.classList.remove('active');
            }
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript.trim();

                if (event.results[i].isFinal) {
                    // Process final sentence
                    if (transcript.length > 0 && transcript !== this.lastProcessedText) {
                        this.processFinalSegment(transcript);
                        this.lastProcessedText = transcript;
                        interimTranscript = ''; // Reset interim
                    }
                } else {
                    interimTranscript = transcript;
                }
            }

            // Show duplicate prevention for interim
            if (interimTranscript === this.lastProcessedText) {
                interimTranscript = '';
            }

            this.updateInterimDisplay(interimTranscript);
        };

        this.recognition.onerror = (event) => {
            if (event.error === 'not-allowed') {
                this.showToast('يرجى السماح بالميكروفون');
                this.isListening = false;
                this.micButton.classList.remove('listening');
            }
            console.warn('Speech error:', event.error);
        };
    }

    // Create new blocks for the final sentence and translate ONLY that sentence
    async processFinalSegment(text) {
        // 1. Add Original Text Block
        this.appendSegment(this.originalContainer, text, 'final-text');

        // 2. Translate and Add Target Blocks
        // We do this in parallel for speed
        this.translateAndAppend(text, 'en', this.englishContainer);
        this.translateAndAppend(text, 'fr', this.frenchContainer);
        this.translateAndAppend(text, 'zh', this.chineseContainer);

        // Scroll to bottom
        this.scrollToBottom();
    }

    async translateAndAppend(text, lang, container) {
        // Create a loading placeholder
        const placeholder = this.appendSegment(container, '...', 'loading-text');

        try {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ar|${lang}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.responseStatus === 200 && data.responseData) {
                let translated = data.responseData.translatedText;
                // Fix common HTML entity issues
                translated = translated.replace(/&quot;/g, '"').replace(/&#39;/g, "'");

                // Update the placeholder with actual text
                placeholder.textContent = translated;
                placeholder.className = 'final-text animate-in';
            } else {
                placeholder.textContent = '---';
            }
        } catch (e) {
            console.error(e);
            placeholder.textContent = 'خطأ';
        }
        this.scrollToBottom();
    }

    // Helper to add a new paragraph to a container
    appendSegment(container, text, className) {
        // Create paragraph
        const p = document.createElement('p');
        p.textContent = text;
        p.className = className;

        // Determine where to insert (before the interim element)
        // We look for the interim wrapper
        const interimWrapper = container.querySelector('.interim-wrapper');
        if (interimWrapper) {
            container.insertBefore(p, interimWrapper);
        } else {
            container.appendChild(p);
        }
        return p;
    }

    // Update the "gray" text that changes while speaking
    updateInterimDisplay(text) {
        // Ensure interim wrappers exist
        this.ensureInterimWrappers();

        this.interimElements.original.textContent = text;
        // Optionally, we could try to "guess" translate interim, but for limit saving we won't
        // just show dots in other languages if user talks a lot? 
        // For now, keep others empty until final, or show "..." if text is long

        if (text.length > 5) {
            this.interimElements.en.textContent = '...';
            this.interimElements.fr.textContent = '...';
            this.interimElements.zh.textContent = '...';
        } else {
            this.interimElements.en.textContent = '';
            this.interimElements.fr.textContent = '';
            this.interimElements.zh.textContent = '';
        }

        this.scrollToBottom();
    }

    ensureInterimWrappers() {
        if (!this.originalContainer.querySelector('.interim-wrapper')) {
            this.interimElements.original = this.createInterimWrapper(this.originalContainer);
            this.interimElements.en = this.createInterimWrapper(this.englishContainer);
            this.interimElements.fr = this.createInterimWrapper(this.frenchContainer);
            this.interimElements.zh = this.createInterimWrapper(this.chineseContainer);
        }
    }

    createInterimWrapper(container) {
        const div = document.createElement('div');
        div.className = 'interim-wrapper';
        const span = document.createElement('span');
        span.className = 'interim-text';
        div.appendChild(span);
        container.appendChild(div);
        return span;
    }

    scrollToBottom() {
        // Scroll all containers
        [this.originalContainer, this.englishContainer, this.frenchContainer, this.chineseContainer]
            .forEach(el => el.scrollTop = el.scrollHeight);
    }

    clearAll() {
        // Reset Logic
        this.lastProcessedText = '';

        const resetContainer = (container, placeholder) => {
            container.innerHTML = ''; // Wipe everything
            // Note: We don't add placeholder text P anymore, we let it be empty or add instruction
            // But to keep design nice, maybe add one instruction p
            if (placeholder) {
                const p = document.createElement('p');
                p.className = 'placeholder-text';
                p.textContent = placeholder;
                container.appendChild(p);
            }
        };

        resetContainer(this.originalContainer, 'اضغط الميكروفون وتحدث...');
        resetContainer(this.englishContainer, 'Translation...');
        resetContainer(this.frenchContainer, 'Traduction...');
        resetContainer(this.chineseContainer, '翻译...');

        this.showToast('تم مسح المحادثة');
    }

    setupEventListeners() {
        this.micButton.addEventListener('click', () => {
            if (this.isListening) this.recognition.stop();
            else this.recognition.start();
        });

        this.clearBtn.addEventListener('click', () => this.clearAll());

        // Copy buttons logic needs to change to copy ALL text in container
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.currentTarget.dataset.lang;
                let container;
                if (lang === 'en') container = this.englishContainer;
                else if (lang === 'fr') container = this.frenchContainer;
                else if (lang === 'zh') container = this.chineseContainer;

                if (container) {
                    const text = container.innerText.replace('...', '').trim();
                    navigator.clipboard.writeText(text);
                    this.showToast('تم النسخ');
                }
            });
        });

        document.querySelectorAll('.speak-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.currentTarget.dataset.lang;
                let container;
                if (lang.includes('en')) container = this.englishContainer;
                else if (lang.includes('fr')) container = this.frenchContainer;
                else if (lang.includes('zh')) container = this.chineseContainer;

                if (container) {
                    const text = container.innerText.replace('...', '').trim();
                    const u = new SpeechSynthesisUtterance(text);
                    u.lang = lang;
                    speechSynthesis.speak(u);
                }
            });
        });
    }

    showToast(msg) {
        const t = this.toast.querySelector('.toast-message');
        if (t) t.textContent = msg;
        this.toast.classList.add('show');
        setTimeout(() => this.toast.classList.remove('show'), 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => new LiveTranslator());
