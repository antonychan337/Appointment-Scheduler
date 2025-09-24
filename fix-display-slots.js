const fs = require('fs');

console.log('Fixing time slot display issue...\n');

// Read customer-app.html
let content = fs.readFileSync('customer-app.html', 'utf8');

// Find the section where slots are displayed
const displaySectionStart = content.indexOf('filteredSlots.forEach(time => {');
const displaySectionEnd = content.indexOf('});', displaySectionStart) + 3;

if (displaySectionStart === -1) {
    console.error('Could not find slot display section!');
    process.exit(1);
}

console.log('Found slot display section at line ~977');

// The issue is that ALL slots are being displayed, even invalid ones
// We need to filter them out BEFORE displaying

// Find the line before forEach
const beforeForEach = content.lastIndexOf('\n', displaySectionStart);
const indentation = '            ';

// Insert a filter before the forEach
const filterCode = `
            // Filter out slots that go past closing time
            const validSlots = filteredSlots.filter(time => {
                const [hours, minutes] = time.split(':').map(Number);
                const slotMinutes = hours * 60 + minutes;
                const endMinutes = slotMinutes + totalDuration;

                // Get closing time
                let closeMinutes = 18 * 60; // Default 6PM
                try {
                    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                    const dayHours = SharedData.getStoreHours()[dayName];
                    if (dayHours && dayHours.close) {
                        const [closeHour, closeMin] = dayHours.close.split(':').map(Number);
                        closeMinutes = closeHour * 60 + closeMin;
                    }
                } catch (e) {
                    // Use defaults
                }

                // Only include slots that have enough time before closing
                return endMinutes <= closeMinutes;
            });

            // Display only valid slots
            validSlots.forEach(time => {`;

// Replace the forEach line
const oldForEach = 'filteredSlots.forEach(time => {';
content = content.replace(oldForEach, filterCode);

// Write the file
fs.writeFileSync('customer-app.html', content);

console.log('✅ Fixed! Added filter to remove slots that go past closing time.');
console.log('Slots that would end after closing time are now completely removed from display.');
console.log('\nClear your browser cache and refresh to see the changes.');