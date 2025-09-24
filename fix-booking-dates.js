const fs = require('fs');

// Fix customer-app.html
console.log('Fixing customer-app.html date generation...');
let content = fs.readFileSync('customer-app.html', 'utf8');

// Fix the maxAdvanceDays issue
content = content.replace(
    '            maxDate.setDate(maxDate.getDate() + bookingPolicies.maxAdvanceDays);',
    '            const maxDays = bookingPolicies.maxBookingDays || bookingPolicies.maxAdvanceDays || 30;\n            maxDate.setDate(maxDate.getDate() + maxDays);'
);

fs.writeFileSync('customer-app.html', content);
console.log('✓ Fixed maxAdvanceDays issue in customer-app.html');

// Fix supabase-bridge.js to initialize the cache properly
console.log('\nFixing supabase-bridge.js booking policies initialization...');
let bridgeContent = fs.readFileSync('supabase-bridge.js', 'utf8');

// Find the SharedData object initialization
const initPattern = /const SharedData = \{/;
if (initPattern.test(bridgeContent)) {
    // Add initialization code right after SharedData object creation
    const initCode = `
// Initialize caches on load
(async function initializeCaches() {
    // Load booking policies into cache
    await SharedData.loadBookingPolicies();
    // Load store hours into cache
    await SharedData.loadStoreHours();
})();

const SharedData = {`;

    bridgeContent = bridgeContent.replace('const SharedData = {', initCode);

    fs.writeFileSync('supabase-bridge.js', bridgeContent);
    console.log('✓ Added cache initialization to supabase-bridge.js');
} else {
    console.log('Could not find SharedData initialization point');
}

console.log('\nFixes applied successfully!');
console.log('Please refresh the customer-app to test the changes.');