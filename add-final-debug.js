const fs = require('fs');

console.log('Adding final debugging to supabase-bridge.js...');

let content = fs.readFileSync('supabase-bridge.js', 'utf8');

// Add debugging before return slots
const returnSlotsPattern = /        return slots;/;
const returnSlotsIndex = content.search(returnSlotsPattern);

if (returnSlotsIndex !== -1) {
    content = content.replace(returnSlotsPattern,
        `        console.log('[Bridge] Generated slots:', slots.length, 'slots for', dayName, '- first few:', slots.slice(0, 5));
        return slots;`);
    console.log('✓ Added debugging before return slots');
} else {
    console.log('⚠ Could not find return slots statement');
}

// Write back
fs.writeFileSync('supabase-bridge.js', content);

console.log('✅ Final debugging added.');