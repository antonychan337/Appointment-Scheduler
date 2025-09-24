const fs = require('fs');

console.log('Adding debugging to supabase-bridge.js getAvailableSlots...');

let content = fs.readFileSync('supabase-bridge.js', 'utf8');

// Find the getAvailableSlots function
const functionPattern = /getAvailableSlots\(date, serviceDuration = 30, barberId = null\) \{/;

if (!functionPattern.test(content)) {
    console.error('Could not find getAvailableSlots function!');
    process.exit(1);
}

// Add debugging at the start of the function
content = content.replace(functionPattern,
    `getAvailableSlots(date, serviceDuration = 30, barberId = null) {
        console.log('[Bridge] getAvailableSlots called with:', {
            date: date,
            dateString: date ? date.toString() : 'null',
            serviceDuration: serviceDuration,
            barberId: barberId
        });`);

// Add debugging for day name extraction
const dayNamePattern = /const dayName = date\.toLocaleDateString\('en-US', \{ weekday: 'long' \}\)\.toLowerCase\(\);/;

if (dayNamePattern.test(content)) {
    content = content.replace(dayNamePattern,
        `const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        console.log('[Bridge] Day name extracted:', dayName);`);
}

// Add debugging for hours retrieval
const dayHoursPattern = /const dayHours = hours\[dayName\];/;

if (dayHoursPattern.test(content)) {
    content = content.replace(dayHoursPattern,
        `const dayHours = hours[dayName];
        console.log('[Bridge] Hours for', dayName + ':', dayHours);`);
}

// Add debugging for closed check
const closedCheckPattern = /if \(!dayHours \|\| dayHours\.closed\) \{/;

if (closedCheckPattern.test(content)) {
    content = content.replace(closedCheckPattern,
        `if (!dayHours || dayHours.closed) {
            console.log('[Bridge] Returning empty - store closed or no hours for', dayName);`);
}

// Add debugging for slot generation
const slotsReturnPattern = /return slots;/g;
let replacementCount = 0;
content = content.replace(slotsReturnPattern, (match, offset) => {
    // Only replace the one in getAvailableSlots (should be around line 1139)
    const beforeText = content.substring(offset - 200, offset);
    if (beforeText.includes('getAvailableSlots')) {
        replacementCount++;
        return `console.log('[Bridge] Returning', slots.length, 'slots:', slots);
        return slots;`;
    }
    return match;
});

// Write the modified content back
fs.writeFileSync('supabase-bridge.js', content);

console.log('✅ Debugging added to supabase-bridge.js');
console.log(`Modified ${replacementCount} return statement(s)`);
console.log('Now you\'ll see detailed debugging when getAvailableSlots is called.');