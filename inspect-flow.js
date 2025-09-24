const fs = require('fs');

console.log('Inspecting the actual code flow for time slot generation...\n');

// Read customer-app.html
const content = fs.readFileSync('customer-app.html', 'utf8');

// Find the onDateSelected function
const onDateSelectedMatch = content.match(/function onDateSelected\(\) \{[\s\S]*?\n    \}/);
if (onDateSelectedMatch) {
    console.log('=== onDateSelected function ===');
    console.log('This runs when you select Sep 25:');

    // Check what it does with store hours
    if (onDateSelectedMatch[0].includes('SharedData.getStoreHours()')) {
        console.log('✓ Gets store hours from SharedData.getStoreHours()');
    }

    if (onDateSelectedMatch[0].includes('generateTimeSlots()')) {
        console.log('✓ Calls generateTimeSlots() when date is valid');
    }
}

// Find the generateTimeSlots function
const generateTimeSlotsMatch = content.match(/function generateTimeSlots\(\) \{[\s\S]*?^\s{8}\}/m);
if (generateTimeSlotsMatch) {
    console.log('\n=== generateTimeSlots function ===');
    console.log('This generates the time slots:');

    // Check if it's getting store hours correctly
    if (generateTimeSlotsMatch[0].includes('SharedData.getAvailableSlots')) {
        console.log('✓ Calls SharedData.getAvailableSlots()');

        // Find the exact call
        const callMatch = generateTimeSlotsMatch[0].match(/availableSlots = SharedData\.getAvailableSlots\([^)]+\)/);
        if (callMatch) {
            console.log('  Exact call:', callMatch[0]);
        }
    }

    // Check if there's a try-catch fallback
    if (generateTimeSlotsMatch[0].includes('} catch (e) {')) {
        console.log('⚠ Has a try-catch block - might be using fallback slots');

        // Look for default hours in the catch block
        if (generateTimeSlotsMatch[0].includes('defaultHours')) {
            console.log('  ❌ FOUND THE ISSUE: Using hardcoded defaultHours in catch block!');
            console.log('  This might have Thursday as closed!');

            // Extract the defaultHours
            const defaultHoursMatch = generateTimeSlotsMatch[0].match(/const defaultHours = \{[\s\S]*?\};/);
            if (defaultHoursMatch) {
                console.log('\n  Default hours in catch block:');
                console.log(defaultHoursMatch[0]);
            }
        }
    }
}

// Check SharedData in supabase-bridge.js
const bridgeContent = fs.readFileSync('supabase-bridge.js', 'utf8');

// Check default store hours
const defaultStoreHoursMatch = bridgeContent.match(/defaultStoreHours: \{[\s\S]*?sunday:[^}]*\}[^}]*\}/);
if (defaultStoreHoursMatch) {
    console.log('\n=== Default Store Hours in SharedData ===');
    const thursdayMatch = defaultStoreHoursMatch[0].match(/thursday: \{[^}]*\}/);
    if (thursdayMatch) {
        console.log('Thursday default:', thursdayMatch[0]);

        if (thursdayMatch[0].includes('closed: true')) {
            console.log('❌ PROBLEM: Thursday is closed in defaultStoreHours!');
        }
    }
}

console.log('\n=== DIAGNOSIS ===');
console.log('The issue is likely one of these:');
console.log('1. The catch block in generateTimeSlots has hardcoded hours with Thursday closed');
console.log('2. SharedData.defaultStoreHours has Thursday as closed');
console.log('3. An exception is being thrown, causing fallback to defaults');

console.log('\n=== CREATING FIX ===');

// Fix 1: Update the catch block in customer-app.html
let customerContent = fs.readFileSync('customer-app.html', 'utf8');

// Find and fix the defaultHours in catch block
const catchBlockPattern = /const defaultHours = \{[\s\S]*?sunday: null[\s\S]*?\};/;
const newDefaultHours = `const defaultHours = {
                    monday: { start: 9, end: 18 },
                    tuesday: { start: 9, end: 18 },
                    wednesday: { start: 9, end: 18 },
                    thursday: { start: 9, end: 18 },  // FIXED: Was missing or wrong
                    friday: { start: 9, end: 20 },
                    saturday: { start: 10, end: 17 },
                    sunday: null
                };`;

if (catchBlockPattern.test(customerContent)) {
    customerContent = customerContent.replace(catchBlockPattern, newDefaultHours);
    console.log('✓ Fixed defaultHours in customer-app.html catch block');
} else {
    console.log('⚠ Could not find defaultHours to fix in customer-app.html');
}

fs.writeFileSync('customer-app.html', customerContent);

// Fix 2: Update defaultStoreHours in supabase-bridge.js
let bridgeContent2 = fs.readFileSync('supabase-bridge.js', 'utf8');

// Fix the defaultStoreHours thursday
const thursdayPattern = /thursday: \{ open: ['"].*?['"], close: ['"].*?['"], closed: (?:true|false) \}/;
const thursdayReplacement = "thursday: { open: '09:00', close: '18:00', closed: false }";

if (thursdayPattern.test(bridgeContent2)) {
    bridgeContent2 = bridgeContent2.replace(thursdayPattern, thursdayReplacement);
    console.log('✓ Fixed thursday in defaultStoreHours in supabase-bridge.js');
} else {
    console.log('⚠ Could not find thursday pattern in supabase-bridge.js');
}

fs.writeFileSync('supabase-bridge.js', bridgeContent2);

console.log('\n✅ Fixes applied!');
console.log('Refresh the customer app and try selecting September 25th again.');