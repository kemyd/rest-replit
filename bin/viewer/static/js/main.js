/* Packs by Shuffle 1.0.0 */
// Utility functions
const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy text:', error);
        return false;
    }
};

class UIManager {
    constructor() {
        this.initializeDOMElements();
        this.setupEventListeners();
    }

    initializeDOMElements() {
        this.addressBar = document.getElementById('shuffle-address-wrapper');
        this.addressDropdown = document.getElementById('shuffle-address-dropdown');
        this.categorySwitches = document.querySelectorAll('[data-shuffle-category]');
        this.modeSwitches = document.querySelectorAll('[data-mode]');
        this.copyButtons = document.querySelectorAll('.shuffle-copy-code');
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupCategoryNavigation();
            this.setupAddressBarToggle();
            this.setupModeSwitching();
            this.setupCodeCopy();
        });
    }

    setupCategoryNavigation() {
        this.categorySwitches.forEach(categorySwitch => {
            categorySwitch.addEventListener('click', (e) => {
                e.preventDefault();
                const href = categorySwitch.querySelector('a').getAttribute('href');
                window.location.href = href;
            });
        });
    }

    setupAddressBarToggle() {
        if (this.addressBar && this.addressDropdown) {
            this.addressBar.addEventListener('click', (e) => {
                e.preventDefault();
                this.addressDropdown.classList.toggle('shuffle-hidden');
            });
        }
    }

    setupModeSwitching() {
        this.modeSwitches.forEach(modeSwitch => {
            modeSwitch.addEventListener('click', (e) => this.handleModeSwitch(e));
        });
    }

    handleModeSwitch(e) {
        e.preventDefault();
        const target = e.currentTarget;
        
        if (target.classList.contains('shuffle-switch-active')) {
            return;
        }

        const newMode = target.getAttribute('data-mode');
        const parent = target.closest('.shuffle-component');
        
        const codeElement = parent.querySelector('[data-mode=code]');
        const previewElement = parent.querySelector('[data-mode=preview]');
        const codeContent = parent.querySelector('.shuffle-code');
        const previewContent = parent.querySelector('.shuffle-preview');

        const isCodeMode = newMode === 'code';
        
        codeElement.classList.toggle('shuffle-switch-active', isCodeMode);
        previewElement.classList.toggle('shuffle-switch-active', !isCodeMode);
        codeContent.classList.toggle('shuffle-hidden', !isCodeMode);
        previewContent.classList.toggle('shuffle-hidden', isCodeMode);
    }

    setupCodeCopy() {
        this.copyButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const parent = e.currentTarget.closest('.shuffle-component');
                const html = parent.querySelector('.shuffle-preview').innerHTML;

                if (copyToClipboard(html)) {
                    this.showCopyConfirmation(e.currentTarget);
                }
            });
        });
    }

    showCopyConfirmation(target) {
        const confirmationElement = target.querySelector('.shuffle-copy-ok');
        confirmationElement.classList.remove('shuffle-hidden');
        
        setTimeout(() => {
            confirmationElement.classList.add('shuffle-hidden');
        }, 500);
    }
}

// Initialize the UI manager when the script loads
new UIManager();
