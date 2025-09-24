// Fix script for owner-app QR code generation

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'owner-app.html');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the generateBookingQRCode function
const oldFunction = `        function generateBookingQRCode(url) {
            const canvas = document.getElementById('booking-qr-canvas');
            if (canvas && typeof QRCode !== 'undefined') {
                QRCode.toCanvas(canvas, url, {
                    width: 200,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    }
                }, function (error) {
                    if (error) console.error('QR Code generation error:', error);
                    else console.log('QR Code generated successfully for:', url);
                });
            }
        }`;

const newFunction = `        function generateBookingQRCode(url) {
            console.log('generateBookingQRCode called with URL:', url);
            const canvas = document.getElementById('booking-qr-canvas');
            console.log('Canvas element:', canvas);
            console.log('QRCode library available:', typeof QRCode !== 'undefined');

            if (!canvas) {
                console.error('Canvas element not found!');
                return;
            }

            if (typeof QRCode === 'undefined') {
                console.error('QRCode library not loaded! Attempting dynamic load...');
                // Try to load it dynamically
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/qrcode@1.5.3/build/qrcode.js';
                script.onload = function() {
                    console.log('QRCode library loaded dynamically, retrying...');
                    generateBookingQRCode(url);
                };
                script.onerror = function() {
                    console.error('Failed to load QRCode library dynamically');
                    alert('Unable to load QR Code library. Please refresh the page.');
                };
                document.head.appendChild(script);
                return;
            }

            try {
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
                        alert('Failed to generate QR code. Please try again.');
                    } else {
                        console.log('QR Code generated successfully for:', url);
                        canvas.style.display = 'block'; // Ensure canvas is visible
                    }
                });
            } catch (e) {
                console.error('Exception generating QR code:', e);
                alert('Error generating QR code: ' + e.message);
            }
        }`;

if (content.includes(oldFunction)) {
    content = content.replace(oldFunction, newFunction);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully updated generateBookingQRCode function in owner-app.html');
} else {
    console.log('Could not find the exact function to replace. The function may have already been modified.');
    // Try a more flexible approach
    const startPattern = 'function generateBookingQRCode(url) {';
    const startIndex = content.indexOf(startPattern);

    if (startIndex !== -1) {
        // Find the closing brace of the function
        let braceCount = 0;
        let inFunction = false;
        let endIndex = -1;

        for (let i = startIndex; i < content.length; i++) {
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
            // Extract the full function including indentation
            const lineStart = content.lastIndexOf('\n', startIndex) + 1;
            const indent = content.substring(lineStart, startIndex);
            const oldFunctionActual = content.substring(lineStart, endIndex);

            console.log('Found function, replacing...');
            content = content.substring(0, lineStart) + newFunction + content.substring(endIndex);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Successfully updated generateBookingQRCode function (flexible match)');
        }
    }
}