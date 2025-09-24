const fs = require('fs');

console.log('Fixing service duration issue in customer-app.html...\n');

let content = fs.readFileSync('customer-app.html', 'utf8');

// Find the section where totalDuration is calculated in generateTimeSlots
const oldCalculation = `            // Calculate total service duration
            const totalDuration = selectedServices.reduce((sum, serviceId) => {
                return sum + (serviceData[serviceId]?.duration || 30);
            }, 0);`;

const newCalculation = `            // Calculate total service duration using actual service data from SharedData
            const services = SharedData.getServices();
            const totalDuration = selectedServices.reduce((sum, serviceId) => {
                const service = services[serviceId];
                return sum + (service ? service.duration : 30);
            }, 0);`;

content = content.replace(oldCalculation, newCalculation);

// Also fix the other places where serviceData is used for duration
// In the goToConfirmation function (around line 221)
const oldConfirmCalc = `            const totalDuration = selectedServices.reduce((sum, s) => sum + serviceData[s].duration, 0);`;
const newConfirmCalc = `            const services = SharedData.getServices();
            const totalDuration = selectedServices.reduce((sum, s) => {
                const service = services[s];
                return sum + (service ? service.duration : 0);
            }, 0);`;

content = content.replace(oldConfirmCalc, newConfirmCalc);

// In the confirmBooking function (around line 274)
const oldBookingCalc1 = `            const totalDuration = selectedServices.reduce((sum, s) => sum + serviceData[s].duration, 0);`;
const newBookingCalc1 = `            const services = SharedData.getServices();
            const totalDuration = selectedServices.reduce((sum, s) => {
                const service = services[s];
                return sum + (service ? service.duration : 0);
            }, 0);`;

content = content.replace(oldBookingCalc1, newBookingCalc1);

// Also need to fix the totalPrice calculations to use SharedData
const oldPriceCalc = `            const totalPrice = selectedServices.reduce((sum, s) => sum + serviceData[s].price, 0);`;
const newPriceCalc = `            const totalPrice = selectedServices.reduce((sum, s) => {
                const service = services[s];
                return sum + (service ? service.price : 0);
            }, 0);`;

content = content.replace(oldPriceCalc, newPriceCalc);

// Also fix service name lookups to use SharedData
// This is more complex as it appears in multiple places

fs.writeFileSync('customer-app.html', content);

console.log('✅ Fixed service duration calculations to use SharedData.getServices()');
console.log('Now the time slots will be calculated based on the actual service duration.');
console.log('\nFor Women\'s Cut (45 minutes) closing at 6:00 PM:');
console.log('- Last valid slot should be 5:15 PM (ends at 6:00 PM)');
console.log('- 5:30 PM should NOT be shown as it would end at 6:15 PM');
console.log('\nClear your browser cache and refresh to see the changes.');