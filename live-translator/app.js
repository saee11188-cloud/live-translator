/**
 * Live Translator - Real-time Speech Recognition and Multi-Language Translation
 * Translates Arabic speech to English, French, and Chinese simultaneously
 * Fixed: Prevents duplicate text repetition
 */

class LiveTranslator {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.finalTranscript = '';
        this.lastProcessedText = ''; // Track last processed text to avoid duplicates

        // Target languages
        this.targetLanguages = ['en', 'fr', 'zh'];

        // DOM Elements
        this.micButton = document.getElementById('micButton');
        this.micLabel = document.getElementById('micLabel');
        this.liveIndicator = document.getElementById('liveIndicator');
        this.originalText = document.getElementById('originalText');
        this.englishText = document.getElementById('englishText');
        this.frenchText = document.getElementById('frenchText');
        this.chineseText = document.getElementById('chineseText');
        this.clearBtn = document.getElementById('clearBtn');
        this.toast = document.getElementById('toast');
        this.warningModal = document.getElementById('warningModal');
        this.closeWarning = document.getElementById('closeWarning');

        // Translation cache to avoid re-translating same text
        this.translationCache = new Map();

        // Debounce timer for translation
        this.translationTimer = null;

        this.init();
    }

    init() {
        // Check for browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.warningModal.classList.add('show');
            this.closeWarning.addEventListener('click', () => {
                this.warningModal.classList.remove('show');
            });
            return;
        }

        this.setupSpeechRecognition();
        this.setupEventListeners();
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'ar-SA'; // Arabic language
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.micButton.classList.add('listening');
            this.micLabel.textContent = 'اضغط للإيقاف';
            this.liveIndicator.classList.add('active');
        };

        this.recognition.onend = () => {
            if (this.isListening) {
                // Restart if still supposed to be listening
                setTimeout(() => {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        console.log('Recognition restart failed:', e);
                    }
                }, 100);
            } else {
                this.micButton.classList.remove('listening');
                this.micLabel.textContent = 'اضغط للبدء';
                this.liveIndicator.classList.remove('active');
            }
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let currentFinalTranscript = '';

            // Process only new results
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript.trim();

                if (event.results[i].isFinal) {
                    // Only add if it's new text (not already in finalTranscript)
                    if (transcript && !this.finalTranscript.includes(transcript)) {
                        currentFinalTranscript = transcript;
                    }
                } else {
                    interimTranscript = transcript;
                }
            }

            // Add new final transcript
            if (currentFinalTranscript) {
                this.finalTranscript += currentFinalTranscript + ' ';

                // Translate only if text changed
                const textToTranslate = this.finalTranscript.trim();
                if (textToTranslate !== this.lastProcessedText) {
                    this.lastProcessedText = textToTranslate;
                    clearTimeout(this.translationTimer);
                    this.translateToAllLanguages(textToTranslate);
                }
            }

            // Update display
            this.updateOriginalText(interimTranscript);

            // Debounced translation for interim results
            if (interimTranscript && !currentFinalTranscript) {
                clearTimeout(this.translationTimer);
                this.translationTimer = setTimeout(() => {
                    const fullText = (this.finalTranscript + interimTranscript).trim();
                    if (fullText !== this.lastProcessedText) {
                        this.translateToAllLanguages(fullText);
                    }
                }, 800);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);

            if (event.error === 'not-allowed') {
                this.showToast('يرجى السماح بالوصول إلى الميكروفون');
                this.isListening = false;
                this.micButton.classList.remove('listening');
                this.micLabel.textContent = 'اضغط للبدء';
                this.liveIndicator.classList.remove('active');
            } else if (event.error === 'no-speech') {
                // Ignore no-speech errors
            } else if (event.error === 'network') {
                this.showToast('تحقق من اتصالك بالإنترنت');
            }
        };
    }

    setupEventListeners() {
        // Mic button
        this.micButton.addEventListener('click', () => this.toggleListening());

        // Copy buttons
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.currentTarget.dataset.lang;
                this.copyTranslation(lang);
            });
        });

        // Speak buttons
        document.querySelectorAll('.speak-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.currentTarget.dataset.lang;
                this.speakTranslation(lang);
            });
        });

        // Clear all
        this.clearBtn.addEventListener('click', () => this.clearAll());

        // Keyboard shortcut (Space to toggle)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target === document.body) {
                e.preventDefault();
                this.toggleListening();
            }
        });
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    startListening() {
        // Reset transcripts when starting fresh
        this.finalTranscript = '';
        this.lastProcessedText = '';
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
        }
    }

    stopListening() {
        this.isListening = false;
        try {
            this.recognition.stop();
        } catch (error) {
            console.error('Error stopping recognition:', error);
        }
    }

    updateOriginalText(interimTranscript = '') {
        let html = '';

        if (this.finalTranscript) {
            html += `<span class="final-text">${this.finalTranscript}</span>`;
        }

        if (interimTranscript) {
            html += `<span class="interim-text">${interimTranscript}</span>`;
        }

        if (html) {
            this.originalText.innerHTML = `<p>${html}</p>`;
        } else {
            this.originalText.innerHTML = '<p class="placeholder-text">اضغط على زر الميكروفون وابدأ بالتحدث...</p>';
        }
    }

    async translateToAllLanguages(text) {
        if (!text.trim()) return;

        // Show loading state for all
        this.showLoadingState();

        // Translate to all languages in parallel
        const translations = await Promise.all([
            this.translateText(text, 'en'),
            this.translateText(text, 'fr'),
            this.translateText(text, 'zh')
        ]);

        // Update UI with translations
        this.englishText.innerHTML = `<p class="final-text">${translations[0]}</p>`;
        this.frenchText.innerHTML = `<p class="final-text">${translations[1]}</p>`;
        this.chineseText.innerHTML = `<p class="final-text">${translations[2]}</p>`;
    }

    showLoadingState() {
        const loadingHTML = '<p class="placeholder-text"><span class="loading-dots"><span></span><span></span><span></span></span></p>';
        this.englishText.innerHTML = loadingHTML;
        this.frenchText.innerHTML = loadingHTML;
        this.chineseText.innerHTML = loadingHTML;
    }

    async translateText(text, targetLang) {
        // Check cache first
        const cacheKey = `${text}_${targetLang}`;
        if (this.translationCache.has(cacheKey)) {
            return this.translationCache.get(cacheKey);
        }

        try {
            // Using MyMemory Translation API (free, no API key required)
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ar|${targetLang}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.responseStatus === 200 && data.responseData) {
                let translation = data.responseData.translatedText;

                // Clean up the translation
                translation = translation.replace(/&quot;/g, '"');
                translation = translation.replace(/&#39;/g, "'");

                // Cache the result
                this.translationCache.set(cacheKey, translation);

                return translation;
            } else {
                throw new Error('Translation failed');
            }
        } catch (error) {
            console.error(`Translation error (${targetLang}):`, error);
            return this.getPlaceholderForLang(targetLang);
        }
    }

    getPlaceholderForLang(lang) {
        const placeholders = {
            'en': 'Translation unavailable',
            'fr': 'Traduction non disponible',
            'zh': '翻译不可用'
        };
        return placeholders[lang] || 'Error';
    }

    copyTranslation(lang) {
        let textElement;
        switch (lang) {
            case 'en':
                textElement = this.englishText;
                break;
            case 'fr':
                textElement = this.frenchText;
                break;
            case 'zh':
                textElement = this.chineseText;
                break;
        }

        const text = textElement.textContent;
        if (text && !text.includes('...') && !text.includes('unavailable')) {
            navigator.clipboard.writeText(text).then(() => {
                this.showToast('تم نسخ الترجمة!');
            }).catch(() => {
                this.showToast('تعذر النسخ');
            });
        }
    }

    speakTranslation(lang) {
        let textElement;
        switch (lang) {
            case 'en-US':
                textElement = this.englishText;
                break;
            case 'fr-FR':
                textElement = this.frenchText;
                break;
            case 'zh-CN':
                textElement = this.chineseText;
                break;
        }

        const text = textElement.textContent;
        if (text && !text.includes('...') && !text.includes('unavailable')) {
            // Stop any ongoing speech
            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;

            // Find a voice for the target language
            const voices = speechSynthesis.getVoices();
            const targetVoice = voices.find(voice => voice.lang.startsWith(lang.split('-')[0]));
            if (targetVoice) {
                utterance.voice = targetVoice;
            }

            speechSynthesis.speak(utterance);
            this.showToast('جاري النطق...');
        }
    }

    clearAll() {
        this.finalTranscript = '';
        this.lastProcessedText = '';
        this.translationCache.clear();

        this.originalText.innerHTML = '<p class="placeholder-text">اضغط على زر الميكروفون وابدأ بالتحدث...</p>';
        this.englishText.innerHTML = '<p class="placeholder-text">Translation will appear here...</p>';
        this.frenchText.innerHTML = '<p class="placeholder-text">La traduction apparaîtra ici...</p>';
        this.chineseText.innerHTML = '<p class="placeholder-text">翻译将显示在这里...</p>';

        this.showToast('تم مسح الكل');
    }

    showToast(message) {
        this.toast.querySelector('.toast-message').textContent = message;
        this.toast.classList.add('show');

        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 2500);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new LiveTranslator();

    // Load voices (for speech synthesis)
    if ('speechSynthesis' in window) {
        speechSynthesis.getVoices();
        speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
    }
});
