const fs = require('fs');

console.log('Fixing customer app to show services when only owner/single barber exists...');

let content = fs.readFileSync('customer-app.html', 'utf8');

// Find the initializeShop function where barbers are loaded
const initFunctionPattern = /if \(barbers\.length === 1\) \{[\s\S]*?showScreen\('service-screen'\);/;

const match = content.match(initFunctionPattern);
if (match) {
    console.log('✓ Found single barber logic');

    // The logic already exists to auto-select single barber
    // Check if loadServicesForBarber is being called correctly

    // Let's add some debugging
    const debugPattern = /console\.log\('Single barber found, ID:', selectedBarberId\);/;

    if (content.includes("console.log('Single barber found, ID:', selectedBarberId);")) {
        console.log('✓ Debug logging already in place');
    }

    // Make sure the loadServicesForBarber function properly handles the owner
    const loadServicesPattern = /function loadServicesForBarber\(barberId\) \{/;

    if (loadServicesPattern.test(content)) {
        console.log('✓ loadServicesForBarber function exists');

        // Add debugging to see what's happening
        content = content.replace(
            'function loadServicesForBarber(barberId) {',
            `function loadServicesForBarber(barberId) {
            console.log('[DEBUG] loadServicesForBarber called with barberId:', barberId);`
        );

        // Also add debug to see what services are found
        const serviceLoopPattern = /barberServiceIds\.forEach\(serviceId => \{/;

        if (serviceLoopPattern.test(content)) {
            content = content.replace(
                'barberServiceIds.forEach(serviceId => {',
                `console.log('[DEBUG] Barber service IDs:', barberServiceIds);
            console.log('[DEBUG] All services:', Object.keys(allServices));
            barberServiceIds.forEach(serviceId => {`
            );
            console.log('✓ Added service loading debug');
        }
    }
} else {
    console.log('⚠ Could not find single barber auto-select logic');
}

// Also check the barber services assignment
// The issue might be that owner.services is empty or not properly formatted
const getBarberServicesPattern = /if \(Array\.isArray\(barber\.services\)\) \{/;

if (getBarberServicesPattern.test(content)) {
    console.log('✓ Found barber services handling');

    // Add debugging for service format
    content = content.replace(
        'if (Array.isArray(barber.services)) {',
        `console.log('[DEBUG] Barber services format:', typeof barber.services, barber.services);
            if (Array.isArray(barber.services)) {`
    );
}

// Write back the modified content
fs.writeFileSync('customer-app.html', content);

console.log('\n✅ Added debugging to customer-app.html');
console.log('\nNow when you open the customer app, check the browser console (F12) to see:');
console.log('1. What barber ID is being selected');
console.log('2. What services the barber has assigned');
console.log('3. Whether services are being loaded correctly');
console.log('\nIf barber.services is empty or undefined, you need to:');
console.log('1. Open the owner app');
console.log('2. Go to Staff Management');
console.log('3. Make sure the owner has services assigned');