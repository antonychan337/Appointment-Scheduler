const fs = require('fs');

console.log('Adding detailed date debugging to customer-app.html...');

let content = fs.readFileSync('customer-app.html', 'utf8');

// Find the generateTimeSlots function
const generateTimeSlotsStart = 'function generateTimeSlots() {';
const functionIndex = content.indexOf(generateTimeSlotsStart);

if (functionIndex === -1) {
    console.error('Could not find generateTimeSlots function!');
    process.exit(1);
}

// Add comprehensive debugging at the start of generateTimeSlots
const debugCode = `function generateTimeSlots() {
            console.log('=== generateTimeSlots called ===');
            console.log('selectedDate:', selectedDate);
            if (selectedDate) {
                console.log('selectedDate string:', selectedDate.toString());
                console.log('selectedDate ISO:', selectedDate.toISOString());
                console.log('selectedDate local:', selectedDate.toLocaleDateString());
                console.log('Day of week:', selectedDate.toLocaleDateString('en-US', { weekday: 'long' }));
            }`;

content = content.replace(generateTimeSlotsStart, debugCode);

// Add debugging in getAvailableSlots call
const getAvailableSlotsPattern = /availableSlots = SharedData\.getAvailableSlots\(selectedDate, totalDuration, selectedBarberId\);/;

if (getAvailableSlotsPattern.test(content)) {
    content = content.replace(getAvailableSlotsPattern,
        `console.log('Calling getAvailableSlots with:', {
                    date: selectedDate,
                    totalDuration: totalDuration,
                    barberId: selectedBarberId
                });
                availableSlots = SharedData.getAvailableSlots(selectedDate, totalDuration, selectedBarberId);
                console.log('Slots returned:', availableSlots);`);
    console.log('✓ Added debugging to getAvailableSlots call');
}

// Add debugging after slot filtering
const noSlotsPattern = /if \(availableSlots\.length === 0\) \{/;
content = content.replace(noSlotsPattern,
    `console.log('Available slots before filtering:', availableSlots.length);
    if (availableSlots.length === 0) {
        console.log('No slots returned from SharedData.getAvailableSlots!');`);

// Write the modified content back
fs.writeFileSync('customer-app.html', content);

console.log('✅ Debugging added to customer-app.html');
console.log('Now when you select Sep 25 in the customer app, you\'ll see detailed debugging in the console.');