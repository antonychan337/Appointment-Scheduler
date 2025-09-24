// Fix script for setup-wizard-app QR code - use same approach as owner-app

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'setup-wizard-app.html');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the QR code library script tag with a working one
const oldScript = '<script src="https://unpkg.com/qrcode@1.5.3/build/qrcode.js"></script>';
const newScript = '<script src="https://cdn.jsdelivr.net/npm/qrcode@latest/build/qrcode.js"></script>';

let scriptUpdated = false;
if (content.includes(oldScript)) {
    content = content.replace(oldScript, newScript);
    scriptUpdated = true;
    console.log('Updated QRCode library CDN URL');
} else {
    console.log('Checking for other qrcode script variations...');

    // Try to find any qrcode script tag
    const scriptPattern = /<script\s+src="[^"]*qrcode[^"]*"[^>]*><\/script>/i;
    const match = content.match(scriptPattern);

    if (match) {
        console.log('Found existing QRCode script:', match[0]);
        content = content.replace(match[0], newScript);
        scriptUpdated = true;
        console.log('Replaced with new CDN URL');
    }
}

// Update the generateQRCode function with better error handling
const improvedFunction = `        function generateQRCode(url) {
            console.log('Generating QR code for URL:', url);
            const canvas = document.getElementById('qr-code-canvas');
            console.log('Canvas element:', canvas);
            console.log('QRCode library available:', typeof QRCode !== 'undefined');

            if (!canvas) {
                console.error('Canvas element not found!');
                return;
            }

            // Check if QRCode library is available
            if (typeof QRCode === 'undefined') {
                console.log('QRCode not loaded yet, waiting...');

                // Wait for library to load
                let attempts = 0;
                const checkInterval = setInterval(() => {
                    attempts++;
                    if (typeof QRCode !== 'undefined') {
                        clearInterval(checkInterval);
                        console.log('QRCode library now available!');
                        generateQRCode(url); // Retry
                    } else if (attempts > 20) {
                        clearInterval(checkInterval);
                        console.error('QRCode library failed to load after 10 seconds');

                        // Last resort - try alternative library
                        console.log('Attempting to load alternative QR library...');
                        const script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
                        script.onload = function() {
                            console.log('Alternative library loaded, generating with QRCodeJS...');
                            // Use alternative library syntax
                            const qrContainer = document.createElement('div');
                            qrContainer.id = 'qr-alternative';
                            qrContainer.style.background = 'white';
                            qrContainer.style.padding = '10px';
                            qrContainer.style.display = 'inline-block';
                            canvas.parentElement.appendChild(qrContainer);
                            new QRCode(qrContainer, {
                                text: url,
                                width: 200,
                                height: 200
                            });
                            canvas.style.display = 'none'; // Hide original canvas
                        };
                        script.onerror = function() {
                            console.error('Failed to load alternative library');
                            alert('Unable to generate QR code. Please refresh the page and try again.');
                        };
                        document.head.appendChild(script);
                    }
                }, 500);
                return;
            }

            // Generate QR code
            if (canvas && typeof QRCode !== 'undefined') {
                try {
                    console.log('Generating QR code with QRCode library...');
                    QRCode.toCanvas(canvas, url, {
                        width: 200,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#ffffff'
                        }
                    }, function (error) {
                        if (error) {
                            console.error('QR Code generation error:', error);
                            alert('Failed to generate QR code. Please refresh and try again.');
                        } else {
                            console.log('QR Code generated successfully');
                            canvas.style.display = 'block'; // Ensure canvas is visible
                        }
                    });
                } catch (e) {
                    console.error('Exception generating QR code:', e);
                }
            } else {
                console.error('QR Code generation failed - canvas or library missing');
                if (!canvas) console.error('Canvas element not found');
                if (typeof QRCode === 'undefined') console.error('QRCode library not loaded');
            }
        }`;

// Find and replace the generateQRCode function
const functionStart = content.indexOf('function generateQRCode(url) {');
if (functionStart !== -1) {
    // Find the end of the function
    let braceCount = 0;
    let inFunction = false;
    let endIndex = -1;

    for (let i = functionStart; i < content.length; i++) {
        if (content[i] === '{') {
            braceCount++;
            inFunction = true;
        } else if (content[i] === '}' && inFunction) {
            braceCount--;
            if (braceCount === 0) {
                endIndex = i + 1;
                break;
            }
        }
    }

    if (endIndex !== -1) {
        // Get proper indentation
        const lineStart = content.lastIndexOf('\n', functionStart) + 1;
        const oldFunction = content.substring(lineStart, endIndex);

        content = content.substring(0, lineStart) + improvedFunction + content.substring(endIndex);
        console.log('Updated generateQRCode function');
    }
} else {
    console.log('generateQRCode function not found');
}

// Write the updated content
fs.writeFileSync(filePath, content, 'utf8');
console.log('setup-wizard-app.html has been updated successfully!');
if (scriptUpdated) {
    console.log('⚠️ The CDN URL was updated. Please do a hard refresh (Ctrl+F5) to ensure the new script loads.')
}
console.log('Please refresh the page to see the changes.');