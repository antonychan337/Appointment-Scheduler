// Script to fix owner selection in owner-app.html
// Run this with Node.js: node apply-owner-fix.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'owner-app.html');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Change hardcoded 'owner' ID to null
content = content.replace(
    "window.currentBarberId = 'owner';",
    "window.currentBarberId = null;  // Will be set to first barber (owner)"
);

// Fix 2: Update selectBarber function to handle null and use first barber
const selectBarberPattern = /function selectBarber\(barberId\) \{[\s\S]*?window\.currentBarberId = barberId;/;
const selectBarberReplacement = `function selectBarber(barberId) {
                // If no barberId provided, select the first barber (owner)
                if (!barberId && barbers.length > 0) {
                    barberId = barbers[0].id;
                }

                window.currentBarberId = barberId;`;

content = content.replace(selectBarberPattern, selectBarberReplacement);

// Fix 3: Update the fallback when barber not found
content = content.replace(
    "console.warn(`Barber ${barberId} not found, using default`);\n                    barber = barbers[0] || { id: 'owner', name: 'Owner', isOwner: true };",
    "console.warn(`Barber ${barberId} not found, using first barber (owner)`);\n                    barber = barbers[0] || { id: null, name: 'Owner', isOwner: true };\n                    if (barber && barber.id) {\n                        window.currentBarberId = barber.id;\n                    }"
);

// Fix 4: Select first barber after loading
const afterRenderPattern = /renderStaffTabs\(\);\s*\/\/ Don't auto-select a barber - let user click on one/;
const afterRenderReplacement = `renderStaffTabs();
                // Select the first barber (owner) by default
                if (!window.currentBarberId && barbers.length > 0) {
                    selectBarber(barbers[0].id);
                }`;

content = content.replace(afterRenderPattern, afterRenderReplacement);

// Write the fixed content back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Successfully fixed owner-app.html!');
console.log('The following changes were made:');
console.log('1. Changed window.currentBarberId from "owner" to null');
console.log('2. Updated selectBarber function to use first barber when no ID provided');
console.log('3. Fixed fallback logic to use first barber instead of hardcoded owner');
console.log('4. Added auto-selection of first barber after loading');
console.log('\nThe "Barber owner not found" warning should no longer appear.');