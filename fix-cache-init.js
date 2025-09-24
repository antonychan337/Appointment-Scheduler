const fs = require('fs');

console.log('Fixing supabase-bridge.js cache initialization...');
let content = fs.readFileSync('supabase-bridge.js', 'utf8');

// Remove the problematic initialization code that runs before SharedData is defined
content = content.replace(
    `// Replacement for SharedData object

// Initialize caches on load
(async function initializeCaches() {
    // Load booking policies into cache
    await SharedData.loadBookingPolicies();
    // Load store hours into cache
    await SharedData.loadStoreHours();
})();

const SharedData = {`,
    `// Replacement for SharedData object
const SharedData = {`
);

// Add initialization after SharedData is defined
content = content.replace(
    `// Initialize on load
SharedData.initialize();`,
    `// Initialize on load
SharedData.initialize();

// Initialize caches after SharedData is defined
(async function initializeCaches() {
    // Wait a bit for SharedData to be ready
    setTimeout(async () => {
        try {
            // Load booking policies into cache
            await SharedData.loadBookingPolicies();
            console.log('Booking policies cache loaded');
            // Load store hours into cache
            await SharedData.loadStoreHours();
            console.log('Store hours cache loaded');
        } catch (error) {
            console.warn('Cache initialization error:', error);
        }
    }, 100);
})();`
);

fs.writeFileSync('supabase-bridge.js', content);
console.log('✓ Fixed cache initialization order');
console.log('The caches will now be initialized after SharedData is defined.');