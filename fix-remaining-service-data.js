const fs = require('fs');

console.log('Fixing all remaining serviceData usage in customer-app.html...\n');

let content = fs.readFileSync('customer-app.html', 'utf8');

// Fix line 900-903 - generateTimeSlots function
const oldGenSlots = `            // Calculate total service duration
            const totalDuration = selectedServices.reduce((sum, serviceId) => {
                return sum + (serviceData[serviceId]?.duration || 30);
            }, 0);`;

const newGenSlots = `            // Calculate total service duration using actual service data from SharedData
            const services = SharedData.getServices();
            const totalDuration = selectedServices.reduce((sum, serviceId) => {
                const service = services[serviceId];
                return sum + (service ? service.duration : 30);
            }, 0);`;

if (content.includes(oldGenSlots)) {
    content = content.replace(oldGenSlots, newGenSlots);
    console.log('✅ Fixed duration calculation in generateTimeSlots (line ~900)');
} else {
    console.log('⚠️  Already fixed or not found: generateTimeSlots duration');
}

// Fix lines 1184-1185 in confirmBooking
const oldConfirmBooking = `            const totalDuration = selectedServices.reduce((sum, s) => sum + serviceData[s].duration, 0);
            const totalPrice = selectedServices.reduce((sum, s) => sum + serviceData[s].price, 0);`;

const newConfirmBooking = `            const services = SharedData.getServices();
            const totalDuration = selectedServices.reduce((sum, s) => {
                const service = services[s];
                return sum + (service ? service.duration : 0);
            }, 0);
            const totalPrice = selectedServices.reduce((sum, s) => {
                const service = services[s];
                return sum + (service ? service.price : 0);
            }, 0);`;

if (content.includes(oldConfirmBooking)) {
    content = content.replace(oldConfirmBooking, newConfirmBooking);
    console.log('✅ Fixed duration and price in confirmBooking (line ~1184)');
} else {
    console.log('⚠️  Already fixed or not found: confirmBooking calculations');
}

// Fix lines 1387-1388 in modifyAppointment
const oldModify = `            const totalDuration = selectedServices.reduce((sum, s) => sum + serviceData[s].duration, 0);
            const totalPrice = selectedServices.reduce((sum, s) => sum + serviceData[s].price, 0);`;

const newModify = `            const services = SharedData.getServices();
            const totalDuration = selectedServices.reduce((sum, s) => {
                const service = services[s];
                return sum + (service ? service.duration : 0);
            }, 0);
            const totalPrice = selectedServices.reduce((sum, s) => {
                const service = services[s];
                return sum + (service ? service.price : 0);
            }, 0);`;

if (content.includes(oldModify)) {
    content = content.replace(oldModify, newModify);
    console.log('✅ Fixed duration and price in modifyAppointment (line ~1387)');
} else {
    console.log('⚠️  Already fixed or not found: modifyAppointment calculations');
}

// Save the file
fs.writeFileSync('customer-app.html', content);

console.log('\n✅ All serviceData usage has been fixed to use SharedData.getServices()');
console.log('\nNow when you select:');
console.log('- Women\'s Cut (45 min): Last slot will be 5:15 PM (ends at 6:00 PM)');
console.log('- Men\'s Cut (30 min): Last slot will be 5:30 PM (ends at 6:00 PM)');
console.log('- Children\'s Cut (15 min): Last slot will be 5:45 PM (ends at 6:00 PM)');
console.log('\nClear your browser cache and refresh to see the changes.');