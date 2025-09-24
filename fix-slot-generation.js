const fs = require('fs');

console.log('Fixing slot generation issue...\n');

// Read supabase-bridge.js
let bridgeContent = fs.readFileSync('supabase-bridge.js', 'utf8');

// Find the getAvailableSlots function
const functionStart = bridgeContent.indexOf('getAvailableSlots(date, serviceDuration = 30, barberId = null)');
const functionEnd = bridgeContent.indexOf('\n    },', functionStart);

if (functionStart === -1) {
    console.error('Could not find getAvailableSlots function!');
    process.exit(1);
}

// Extract the function
const functionContent = bridgeContent.substring(functionStart, functionEnd);

// Check current loop condition
const loopMatch = functionContent.match(/for\s*\([^)]+\)/);
if (loopMatch) {
    console.log('Current loop condition:', loopMatch[0]);

    // Check if it needs fixing
    if (loopMatch[0].includes('minutes < closeMinutes')) {
        console.log('❌ Found the problem! Loop still checks closeMinutes.');

        // Fix it
        const oldLoop = loopMatch[0];
        const newLoop = 'for (let minutes = openMinutes; minutes <= lastValidSlot; minutes += 15)';

        bridgeContent = bridgeContent.replace(oldLoop, newLoop);

        fs.writeFileSync('supabase-bridge.js', bridgeContent);
        console.log('✅ Fixed! Loop now only checks lastValidSlot.');
    } else if (loopMatch[0].includes('minutes <= lastValidSlot') && !loopMatch[0].includes('closeMinutes')) {
        console.log('✅ Loop is already correct!');
    } else {
        console.log('⚠️ Unexpected loop condition:', loopMatch[0]);
    }
} else {
    console.error('Could not find loop in function!');
}

// Also check and fix customer-app.html
console.log('\nChecking customer-app.html...');
let customerContent = fs.readFileSync('customer-app.html', 'utf8');

// Find the fallback slot generation
const fallbackMatch = customerContent.match(/for\s*\(let minutes = startMinutes;[^)]+\)/);
if (fallbackMatch) {
    console.log('Found fallback loop:', fallbackMatch[0]);

    if (fallbackMatch[0].includes('minutes < endMinutes')) {
        console.log('❌ Fallback loop also needs fixing.');

        const oldFallback = fallbackMatch[0];
        const newFallback = 'for (let minutes = startMinutes; minutes <= lastValidSlot; minutes += 15)';

        customerContent = customerContent.replace(oldFallback, newFallback);

        fs.writeFileSync('customer-app.html', customerContent);
        console.log('✅ Fixed fallback loop in customer-app.html');
    } else if (fallbackMatch[0].includes('minutes <= lastValidSlot') && !fallbackMatch[0].includes('endMinutes')) {
        console.log('✅ Fallback loop is already correct!');
    }
}

console.log('\n✨ Done! The time slot generation should now stop at 5:30 PM for a 30-minute service when closing at 6:00 PM.');
console.log('Clear your browser cache and refresh to see the changes.');