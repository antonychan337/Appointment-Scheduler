// QRCode Library Loader with fallback
// This script ensures QRCode library is loaded from multiple CDN sources

(function() {
    // Try loading from multiple CDN sources
    const cdnUrls = [
        'https://unpkg.com/qrcode@1.5.3/build/qrcode.js',
        'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.js',
        'https://unpkg.com/qrcode/build/qrcode.js',
        'https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.js'
    ];

    let loaded = false;
    let attempts = 0;

    function loadQRCodeLibrary(index) {
        if (index >= cdnUrls.length) {
            console.error('Failed to load QRCode library from all CDN sources');
            return;
        }

        const script = document.createElement('script');
        script.src = cdnUrls[index];

        script.onload = function() {
            if (typeof QRCode !== 'undefined') {
                console.log('QRCode library loaded successfully from:', cdnUrls[index]);
                loaded = true;
            } else {
                console.warn('Script loaded but QRCode not defined, trying next CDN...');
                loadQRCodeLibrary(index + 1);
            }
        };

        script.onerror = function() {
            console.warn('Failed to load from:', cdnUrls[index], '- trying next CDN...');
            loadQRCodeLibrary(index + 1);
        };

        document.head.appendChild(script);
    }

    // Check if QRCode is already loaded
    if (typeof QRCode === 'undefined') {
        loadQRCodeLibrary(0);
    } else {
        console.log('QRCode library already loaded');
    }
})();