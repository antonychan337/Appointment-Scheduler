// Final fix for owner-app QR code - use a CDN that definitely works

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'owner-app.html');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the QR code library script tag with a working one
const oldScript = '<script src="https://unpkg.com/qrcode@1.5.3/build/qrcode.js"></script>';
const newScript = '<script src="https://cdn.jsdelivr.net/npm/qrcode@latest/build/qrcode.js"></script>';

if (content.includes(oldScript)) {
    content = content.replace(oldScript, newScript);
    console.log('Updated QRCode library CDN URL');
} else {
    console.log('Old script tag not found, checking for variations...');

    // Try to find any qrcode script tag
    const scriptPattern = /<script\s+src="[^"]*qrcode[^"]*"[^>]*><\/script>/i;
    const match = content.match(scriptPattern);

    if (match) {
        console.log('Found existing QRCode script:', match[0]);
        content = content.replace(match[0], newScript);
        console.log('Replaced with new CDN URL');
    }
}

// Also update the generateBookingQRCode function to handle both library types
const improvedFunction = `        function generateBookingQRCode(url) {
            console.log('generateBookingQRCode called with URL:', url);
            const canvas = document.getElementById('booking-qr-canvas');

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
                        generateBookingQRCode(url); // Retry
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
                            canvas.parentElement.appendChild(qrContainer);
                            new QRCode(qrContainer, {
                                text: url,
                                width: 200,
                                height: 200
                            });
                            canvas.style.display = 'none'; // Hide original canvas
                        };
                        document.head.appendChild(script);
                    }
                }, 500);
                return;
            }

            // Generate QR code
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
                    } else {
                        console.log('QR Code generated successfully!');
                        canvas.style.display = 'block';
                    }
                });
            } catch (e) {
                console.error('Exception generating QR code:', e);
            }
        }`;

// Find and replace the generateBookingQRCode function
const functionStart = content.indexOf('function generateBookingQRCode(url) {');
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
        console.log('Updated generateBookingQRCode function');
    }
}

// Write the updated content
fs.writeFileSync(filePath, content, 'utf8');
console.log('owner-app.html has been updated successfully!');
console.log('Please refresh the page to see the changes.');