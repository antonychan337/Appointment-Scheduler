const fs = require('fs');

// Fix 1: Update customer-app.html to wait for SharedData initialization
console.log('Fixing customer-app.html initialization...');
let customerContent = fs.readFileSync('customer-app.html', 'utf8');

// Find the line where bookingPolicies is loaded
const oldInit = '        // Load booking policies\n        const bookingPolicies = SharedData.getBookingPolicies();';

const newInit = `        // Load booking policies (with defaults if cache not ready)
        let bookingPolicies = {
            minBookingHours: 2,
            maxBookingDays: 30,
            cancellationHours: 24
        };

        // Try to get actual policies if available
        try {
            const policies = SharedData.getBookingPolicies();
            if (policies) {
                bookingPolicies = policies;
            }
        } catch (e) {
            console.log('Using default booking policies');
        }`;

customerContent = customerContent.replace(oldInit, newInit);
fs.writeFileSync('customer-app.html', customerContent);
console.log('✓ Fixed booking policies initialization in customer-app.html');

// Fix 2: Update supabase-bridge.js to initialize caches immediately in initialize()
console.log('\nFixing supabase-bridge.js cache initialization...');
let bridgeContent = fs.readFileSync('supabase-bridge.js', 'utf8');

// Find the initialize function and add immediate cache loading
const oldInitialize = `            // Load initial data into cache
            if (currentShopId) {
                console.log('Loading initial data for shop:', currentShopId);
                this.barbersCache = await this.getBarbers();
                this.appointmentsCache = await this.getAppointments();
                await this.loadServices(); // Load services into cache
                this.storeHoursCache = await this.loadStoreHours(); // Load store hours into cache
                this.bookingPoliciesCache = await this.loadBookingPolicies(); // Load booking policies into cache
            } else {
                console.warn('No shop ID available, skipping data load');
            }`;

const newInitialize = `            // Load initial data into cache
            if (currentShopId) {
                console.log('Loading initial data for shop:', currentShopId);

                // Load critical caches first
                this.storeHoursCache = await this.loadStoreHours();
                this.bookingPoliciesCache = await this.loadBookingPolicies();
                console.log('Critical caches loaded:', {
                    storeHours: !!this.storeHoursCache,
                    bookingPolicies: !!this.bookingPoliciesCache
                });

                // Then load other data
                this.barbersCache = await this.getBarbers();
                this.appointmentsCache = await this.getAppointments();
                await this.loadServices();
            } else {
                console.warn('No shop ID available, loading default caches');
                // Load defaults even without shop ID
                this.storeHoursCache = this.defaultStoreHours;
                this.bookingPoliciesCache = {
                    minBookingHours: 2,
                    maxBookingDays: 30,
                    cancellationHours: 24
                };
            }`;

bridgeContent = bridgeContent.replace(oldInitialize, newInitialize);
fs.writeFileSync('supabase-bridge.js', bridgeContent);
console.log('✓ Fixed cache initialization order in supabase-bridge.js');

console.log('\nAll fixes applied successfully!');
console.log('The booking policies should now load properly.');