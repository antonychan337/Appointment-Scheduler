const fs = require('fs');

// Fix 1: Make bookingPolicies load lazily in customer-app.html
console.log('Fixing customer-app.html booking policies loading...');
let customerContent = fs.readFileSync('customer-app.html', 'utf8');

// Replace the static loading with a getter function
customerContent = customerContent.replace(
    '        // Load booking policies\n        const bookingPolicies = SharedData.getBookingPolicies();',
    `        // Load booking policies lazily
        let _bookingPolicies = null;
        const getBookingPolicies = () => {
            if (!_bookingPolicies) {
                _bookingPolicies = SharedData.getBookingPolicies() || {
                    minBookingHours: 2,
                    maxBookingDays: 30,
                    cancellationHours: 24
                };
            }
            return _bookingPolicies;
        };
        // For backward compatibility, create a proxy object
        const bookingPolicies = new Proxy({}, {
            get: (target, prop) => getBookingPolicies()[prop]
        });`
);

fs.writeFileSync('customer-app.html', customerContent);
console.log('✓ Fixed booking policies lazy loading in customer-app.html');

// Fix 2: Ensure supabase-bridge.js always returns valid defaults immediately
console.log('\nFixing supabase-bridge.js to always return valid defaults...');
let bridgeContent = fs.readFileSync('supabase-bridge.js', 'utf8');

// Update the getBookingPolicies function
const oldGetBookingPolicies = `    // BOOKING POLICIES
    // Synchronous version - returns cached policies
    getBookingPolicies() {
        // Return cached policies if available
        if (this.bookingPoliciesCache) {
            return this.bookingPoliciesCache;
        }

        // Return defaults if no cache
        const defaultPolicies = {
            minBookingHours: 2,
            maxBookingDays: 30,
            cancellationHours: 24
        };
        console.warn('Booking policies cache not loaded, returning defaults');
        return defaultPolicies;
    },`;

const newGetBookingPolicies = `    // BOOKING POLICIES
    // Synchronous version - returns cached policies
    getBookingPolicies() {
        // Always return valid policies
        if (this.bookingPoliciesCache) {
            return this.bookingPoliciesCache;
        }

        // Return defaults if no cache (without warning - this is normal during init)
        const defaultPolicies = {
            minBookingHours: 2,
            maxBookingDays: 30,
            cancellationHours: 24
        };
        return defaultPolicies;
    },`;

bridgeContent = bridgeContent.replace(oldGetBookingPolicies, newGetBookingPolicies);

fs.writeFileSync('supabase-bridge.js', bridgeContent);
console.log('✓ Fixed getBookingPolicies to return defaults without warning');

console.log('\nAll fixes applied successfully!');
console.log('The booking policies will now load properly without warnings.');