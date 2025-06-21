// Ship Classification Frontend JavaScript
class ShipClassifier {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.currentFile = null;
        this.isProcessing = false;
    }

    initializeElements() {
        // Upload elements
        this.uploadArea = document.getElementById('uploadArea');
        this.imageInput = document.getElementById('imageInput');
        this.imagePreview = document.getElementById('imagePreview');
        this.previewImg = document.getElementById('previewImg');
        
        // Button elements
        this.changeImageBtn = document.getElementById('changeImage');
        this.classifyBtn = document.getElementById('classifyBtn');
        this.classifyAnotherBtn = document.getElementById('classifyAnother');
        this.downloadResultBtn = document.getElementById('downloadResult');
        
        // Result elements
        this.resultsPlaceholder = document.getElementById('resultsPlaceholder');
        this.resultsContent = document.getElementById('resultsContent');
        this.loadingState = document.getElementById('loadingState');
        this.primaryClassification = document.getElementById('primaryClassification');
        this.confidenceFill = document.getElementById('confidenceFill');
        this.confidenceText = document.getElementById('confidenceText');
        this.resultTimestamp = document.getElementById('resultTimestamp');
        this.resultsList = document.getElementById('resultsList');
        
        // Toast element
        this.toast = document.getElementById('toast');
    }

    setupEventListeners() {
        // Upload area events
        this.uploadArea.addEventListener('click', () => this.imageInput.click());
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // File input change
        this.imageInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Button events
        this.changeImageBtn.addEventListener('click', () => this.resetUpload());
        this.classifyBtn.addEventListener('click', () => this.classifyImage());
        this.classifyAnotherBtn.addEventListener('click', () => this.resetUpload());
        this.downloadResultBtn.addEventListener('click', () => this.downloadReport());
        
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Navbar scroll effect
        window.addEventListener('scroll', () => this.handleNavbarScroll());
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        if (!this.uploadArea.contains(e.relatedTarget)) {
            this.uploadArea.classList.remove('dragover');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
        if (!allowedTypes.includes(file.type)) {
            this.showToast('Please select a valid image file (JPG, PNG, GIF, WEBP, BMP, TIFF)', 'error');
            return;
        }

        // Validate file size (16MB limit)
        const maxSize = 16 * 1024 * 1024; // 16MB
        if (file.size > maxSize) {
            this.showToast('File size must be less than 16MB', 'error');
            return;
        }

        this.currentFile = file;
        this.displayImagePreview(file);
    }

    displayImagePreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.previewImg.src = e.target.result;
            this.uploadArea.style.display = 'none';
            this.imagePreview.style.display = 'block';
            
            // Reset results
            this.resetResults();
            
            this.showToast('Image loaded successfully! Click "Classify" to analyze.', 'success');
        };
        reader.readAsDataURL(file);
    }

    async classifyImage() {
        if (!this.currentFile || this.isProcessing) return;

        this.isProcessing = true;
        this.showLoadingState();
        this.classifyBtn.disabled = true;
        this.classifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
            const formData = new FormData();
            formData.append('image', this.currentFile);

            const response = await fetch('/classify', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.displayResults(data);
                this.showToast('Classification completed successfully!', 'success');
            } else {
                throw new Error(data.error || 'Classification failed');
            }
        } catch (error) {
            console.error('Classification error:', error);
            this.showToast(`Error: ${error.message}`, 'error');
            this.hideLoadingState();
        } finally {
            this.isProcessing = false;
            this.classifyBtn.disabled = false;
            this.classifyBtn.innerHTML = '<i class="fas fa-search"></i> Classify';
        }
    }

    displayResults(data) {
        this.hideLoadingState();
        
        // Update primary result
        const classificationText = data.result.replace('The image is Likely ', '').replace(`. Confidence: ${data.confidence}%`, '');
        this.primaryClassification.textContent = classificationText;
        
        // Animate confidence bar
        setTimeout(() => {
            this.confidenceFill.style.width = `${data.confidence}%`;
            this.confidenceText.textContent = `${data.confidence}%`;
        }, 300);
        
        // Update timestamp
        const timestamp = new Date(data.timestamp).toLocaleString();
        this.resultTimestamp.textContent = `Analyzed on ${timestamp}`;
        
        // Display all classifications
        this.displayAllClassifications(data.all_classes_score);
        
        // Show results
        this.resultsPlaceholder.style.display = 'none';
        this.resultsContent.style.display = 'block';
        
        // Store result data for download
        this.lastResult = data;
    }

    displayAllClassifications(scores) {
        this.resultsList.innerHTML = '';
        
        // Sort scores by confidence
        const sortedScores = Object.entries(scores)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5); // Top 5 results
        
        sortedScores.forEach(([className, confidence]) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            
            const confidenceRounded = Math.round(confidence * 100) / 100;
            
            resultItem.innerHTML = `
                <span class="result-name">${className}</span>
                <span class="result-confidence">${confidenceRounded}%</span>
            `;
            
            this.resultsList.appendChild(resultItem);
        });
    }

    showLoadingState() {
        this.resultsPlaceholder.style.display = 'none';
        this.resultsContent.style.display = 'none';
        this.loadingState.style.display = 'block';
    }

    hideLoadingState() {
        this.loadingState.style.display = 'none';
    }

    resetResults() {
        this.resultsPlaceholder.style.display = 'block';
        this.resultsContent.style.display = 'none';
        this.loadingState.style.display = 'none';
        this.confidenceFill.style.width = '0%';
    }

    resetUpload() {
        this.currentFile = null;
        this.imageInput.value = '';
        this.uploadArea.style.display = 'block';
        this.imagePreview.style.display = 'none';
        this.resetResults();
        this.showToast('Ready for new image upload', 'info');
    }

    downloadReport() {
        if (!this.lastResult) {
            this.showToast('No results to download', 'error');
            return;
        }

        const reportData = {
            timestamp: this.lastResult.timestamp,
            filename: this.lastResult.filename,
            primary_classification: this.lastResult.result,
            confidence: this.lastResult.confidence,
            all_classifications: this.lastResult.all_classes_score
        };

        const dataStr = JSON.stringify(reportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `ship_classification_report_${Date.now()}.json`;
        link.click();
        
        this.showToast('Report downloaded successfully!', 'success');
    }

    showToast(message, type = 'info') {
        const toast = this.toast;
        const icon = toast.querySelector('.toast-icon');
        const messageEl = toast.querySelector('.toast-message');
        
        // Set icon based on type
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };
        
        icon.className = `toast-icon ${icons[type] || icons.info}`;
        messageEl.textContent = message;
        
        // Remove existing type classes and add new one
        toast.classList.remove('success', 'error', 'info');
        toast.classList.add(type, 'show');
        
        // Auto hide after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

    handleNavbarScroll() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'none';
        }
    }
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function capitalizeWords(str) {
    return str.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
}

// Animation utilities
function animateCounter(element, start, end, duration = 2000) {
    const startTime = performance.now();
    const range = end - start;
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = Math.floor(start + (range * progress));
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = end;
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const classifier = new ShipClassifier();
    
    // Animate hero stats on load
    const statNumbers = document.querySelectorAll('.stat-number');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const finalValue = target.textContent.replace(/[^\d]/g, '');
                if (finalValue) {
                    animateCounter(target, 0, parseInt(finalValue), 2000);
                }
                observer.unobserve(target);
            }
        });
    });
    
    statNumbers.forEach(stat => observer.observe(stat));
    
    // Add scroll animations
    const animateOnScroll = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    });
    
    // Apply scroll animations to feature cards
    document.querySelectorAll('.feature-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        animateOnScroll.observe(card);
    });
    
    console.log('Ship Classification App initialized successfully!');
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden - pausing animations');
    } else {
        console.log('Page visible - resuming animations');
    }
});

// Error handling for global errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // You could show a toast notification here for user-facing errors
});

// Handle unhandled promise rejections  
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault(); // Prevent the default browser handling
});