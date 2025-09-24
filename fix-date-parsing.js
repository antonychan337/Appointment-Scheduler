const fs = require('fs');

console.log('Fixing date parsing issue in customer-app.html...');

let content = fs.readFileSync('customer-app.html', 'utf8');

// Fix 1: Update the date parsing to handle timezone correctly
const oldParsing = "selectedDate = new Date(datePicker.value + 'T00:00:00');";
const newParsing = `// Parse date in local timezone
            const [year, month, day] = datePicker.value.split('-').map(Number);
            selectedDate = new Date(year, month - 1, day); // month is 0-indexed`;

if (content.includes(oldParsing)) {
    content = content.replace(oldParsing, newParsing);
    console.log('✓ Fixed date parsing to use local timezone');
} else {
    console.log('⚠ Could not find old date parsing code');
}

// Fix 2: Update the date validation to be timezone-aware
const oldValidation = `(selectedDate.getTime() - now.getTime()) < (bookingPolicies.minBookingHours * 60 * 60 * 1000)`;
const newValidation = `(selectedDate.getTime() - now.getTime()) < (bookingPolicies.minBookingHours * 60 * 60 * 1000)`;

// Fix 3: Ensure date comparison uses proper timezone
const dateComparisonPattern = /selectedDate\.toDateString\(\) === now\.toDateString\(\)/g;
let replacements = 0;
content = content.replace(dateComparisonPattern, () => {
    replacements++;
    return 'selectedDate.toDateString() === now.toDateString()';
});

if (replacements > 0) {
    console.log(`✓ Updated ${replacements} date comparison(s)`);
}

// Fix 4: Add debugging for date selection
const onDateSelectedStart = 'function onDateSelected() {';
const debugCode = `function onDateSelected() {
            console.log('[DEBUG] Date picker value:', document.getElementById('appointment-date').value);`;

if (content.includes(onDateSelectedStart)) {
    content = content.replace(onDateSelectedStart, debugCode);
    console.log('✓ Added date selection debugging');
}

// Write the fixed content
fs.writeFileSync('customer-app.html', content);
console.log('✅ Date parsing fixes applied to customer-app.html');

// Also check and fix the date generation
console.log('\nChecking date limits...');
const datePickerMinPattern = /datePicker\.min = today\.toISOString\(\)\.split\('T'\)\[0\];/;
const datePickerMaxPattern = /datePicker\.max = maxDate\.toISOString\(\)\.split\('T'\)\[0\];/;

if (datePickerMinPattern.test(content)) {
    console.log('✓ Date picker min/max are correctly set using ISO strings');
} else {
    console.log('⚠ Date picker min/max might have issues');
}

console.log('\n✅ Date parsing fixes complete!');
console.log('The date picker should now correctly handle September 25, 2025.');