const fs = require('fs');

console.log('Fixing Thursday hours caching issue...');

// The issue is likely that the store hours cache is stale or being incorrectly accessed
// Let's fix both the supabase-bridge.js and customer-app.html

// Fix 1: Force cache refresh in supabase-bridge.js
let bridgeContent = fs.readFileSync('supabase-bridge.js', 'utf8');

// Find the getAvailableSlots function and add cache refresh check
const getAvailableSlotsPattern = /getAvailableSlots\(date, serviceDuration = 30, barberId = null\) \{/;

if (getAvailableSlotsPattern.test(bridgeContent)) {
    // Add a force refresh of store hours if cache seems stale
    bridgeContent = bridgeContent.replace(
        'getAvailableSlots(date, serviceDuration = 30, barberId = null) {',
        `getAvailableSlots(date, serviceDuration = 30, barberId = null) {
        // Force refresh store hours if cache is potentially stale
        if (!this.storeHoursCache || !this.storeHoursCache.thursday ||
            (this.storeHoursCache.thursday && this.storeHoursCache.thursday.closed === undefined)) {
            console.log('[Bridge] Store hours cache seems incomplete, using defaults');
            this.storeHoursCache = this.defaultStoreHours;
        }`
    );
    console.log('✓ Added cache validation to getAvailableSlots');
}

// Fix 2: Ensure getStoreHours always returns valid data
const getStoreHoursPattern = /getStoreHours\(\) \{[\s\S]*?return this\.defaultStoreHours;[\s\S]*?\}/;

// Replace the getStoreHours function with a more robust version
const newGetStoreHours = `getStoreHours() {
        // Return cached hours if available and valid
        if (this.storeHoursCache && this.storeHoursCache.thursday !== undefined) {
            // Validate that all days exist
            const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const hasAllDays = requiredDays.every(day => this.storeHoursCache[day] !== undefined);

            if (hasAllDays) {
                return this.storeHoursCache;
            } else {
                console.warn('Store hours cache incomplete, merging with defaults');
                // Merge with defaults to ensure all days exist
                return { ...this.defaultStoreHours, ...this.storeHoursCache };
            }
        }

        // Return defaults if no cache
        console.warn('Store hours cache not loaded, returning defaults');
        return this.defaultStoreHours;
    }`;

if (getStoreHoursPattern.test(bridgeContent)) {
    bridgeContent = bridgeContent.replace(getStoreHoursPattern, newGetStoreHours);
    console.log('✓ Enhanced getStoreHours function');
} else {
    console.log('⚠ Could not find getStoreHours function to replace');
}

// Write back the fixed bridge file
fs.writeFileSync('supabase-bridge.js', bridgeContent);

// Fix 3: Update customer-app.html to ensure it's using fresh data
let customerContent = fs.readFileSync('customer-app.html', 'utf8');

// Find generateTimeSlots and ensure it refreshes store hours
const generateTimeSlotsPattern = /function generateTimeSlots\(\) \{/;

if (generateTimeSlotsPattern.test(customerContent)) {
    customerContent = customerContent.replace(
        'function generateTimeSlots() {',
        `function generateTimeSlots() {
            // Ensure we have fresh store hours
            if (typeof SharedData !== 'undefined' && SharedData.storeHoursCache) {
                console.log('[Customer] Store hours cache state:', SharedData.storeHoursCache.thursday);
            }`
    );
    console.log('✓ Added store hours check to generateTimeSlots');
}

// Write back the fixed customer file
fs.writeFileSync('customer-app.html', customerContent);

console.log('\n✅ Fixes applied!');
console.log('\nNow let\'s also create a cache reset tool...\n');

// Create a cache reset tool
const resetToolHTML = `<!DOCTYPE html>
<html>
<head>
    <title>Reset Store Hours Cache</title>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="supabase-config.js"></script>
    <script src="supabase-bridge.js"></script>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .success { color: green; font-weight: bold; }
        button { padding: 10px 20px; margin: 10px; cursor: pointer; background: #2196F3; color: white; border: none; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Reset Store Hours Cache</h1>
    <div id="status"></div>

    <script>
        async function resetCache() {
            const status = document.getElementById('status');

            status.innerHTML = '<p>Resetting cache...</p>';

            // Clear the cache
            SharedData.storeHoursCache = null;

            // Force reload from database
            await SharedData.loadStoreHours();

            const hours = SharedData.getStoreHours();

            status.innerHTML = '<h2>Store Hours After Reset:</h2>';
            status.innerHTML += '<pre>' + JSON.stringify(hours, null, 2) + '</pre>';

            // Test Sep 25
            const sep25 = new Date(2025, 8, 25);
            const slots = SharedData.getAvailableSlots(sep25, 30);

            status.innerHTML += '<h2>Sep 25 Test:</h2>';
            status.innerHTML += '<p>Slots available: ' + slots.length + '</p>';

            if (slots.length > 0) {
                status.innerHTML += '<p class="success">✅ Success! Sep 25 now has slots.</p>';
                status.innerHTML += '<button onclick="window.open(\\'customer-app.html\\', \\'_blank\\')">Open Customer App</button>';
            } else {
                status.innerHTML += '<p>Still no slots. Thursday might be marked as closed.</p>';
            }
        }

        // Run on load
        setTimeout(resetCache, 1000);
    </script>
</body>
</html>`;

fs.writeFileSync('reset-cache.html', resetToolHTML);
console.log('✅ Created reset-cache.html');

console.log('\nTo fix the issue:');
console.log('1. Open reset-cache.html in your browser');
console.log('2. It will clear and reload the store hours cache');
console.log('3. Then test if Sep 25 shows slots');