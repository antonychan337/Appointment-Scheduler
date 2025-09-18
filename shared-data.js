// Shared data storage using localStorage for demo purposes
// In production, this would be handled by the backend API

const SharedData = {
    // Appointments storage
    appointments: [],
    // Blocked times storage
    blockedTimes: [],
    // Default store hours
    defaultStoreHours: {
        monday: { open: '09:00', close: '18:00', closed: false },
        tuesday: { open: '09:00', close: '18:00', closed: false },
        wednesday: { open: '09:00', close: '18:00', closed: false },
        thursday: { open: '09:00', close: '18:00', closed: false },
        friday: { open: '09:00', close: '20:00', closed: false },
        saturday: { open: '10:00', close: '17:00', closed: false },
        sunday: { open: '', close: '', closed: true }
    },

    // Default services
    defaultServices: {
        'mens-cut': {
            name: "Men's Cut",
            duration: 30,
            price: 25,
            enabled: true,
            hasActiveTime: false
        },
        'womens-cut': {
            name: "Women's Cut",
            duration: 45,
            price: 35,
            enabled: true,
            hasActiveTime: false
        },
        'kids-cut': {
            name: "Children's Cut",
            duration: 15,
            price: 15,
            enabled: true,
            hasActiveTime: false
        },
        'coloring': {
            name: "Hair Coloring",
            duration: 90,
            price: 80,
            enabled: true,
            hasActiveTime: true,
            activePeriods: [
                { start: 0, end: 30 },
                { start: 60, end: 90 }
            ]
        },
        'highlights': {
            name: "Highlights",
            duration: 120,
            price: 120,
            enabled: true,
            hasActiveTime: true,
            activePeriods: [
                { start: 0, end: 15 },
                { start: 45, end: 60 },
                { start: 90, end: 120 }
            ]
        }
    },

    // Color palette for default services
    serviceColors: {
        'mens-cut': '#2196F3',     // Blue
        'womens-cut': '#E91E63',   // Pink
        'kids-cut': '#4CAF50',     // Green
        'coloring': '#FF9800',     // Orange
        'highlights': '#9C27B0'     // Purple
    },

    // Color palette for custom services
    colorPalette: ['#795548', '#607D8B', '#FF5722', '#00BCD4', '#8BC34A', '#FFC107', '#3F51B5', '#009688'],

    // Get all appointments
    getAppointments() {
        const stored = localStorage.getItem('appointments');
        return stored ? JSON.parse(stored) : [];
    },

    // Get appointments for a specific date
    getAppointmentsByDate(date) {
        const appointments = this.getAppointments();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        return appointments.filter(apt => apt.date === dateStr);
    },

    // Save new appointment
    saveAppointment(appointment) {
        const appointments = this.getAppointments();
        appointment.id = 'APT' + Date.now() + Math.random().toString(36).substr(2, 5);
        appointment.createdAt = new Date().toISOString();
        appointments.push(appointment);
        localStorage.setItem('appointments', JSON.stringify(appointments));

        // Trigger storage event for other tabs
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'appointments',
            newValue: JSON.stringify(appointments),
            url: window.location.href
        }));

        return appointment.id;
    },

    // Delete appointment
    deleteAppointment(appointmentId) {
        const appointments = this.getAppointments();
        const filtered = appointments.filter(apt => apt.id !== appointmentId);
        localStorage.setItem('appointments', JSON.stringify(filtered));

        // Trigger storage event
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'appointments',
            newValue: JSON.stringify(filtered),
            url: window.location.href
        }));
    },

    // Check if a specific date/time is available
    isTimeAvailable(date, time) {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
        const hours = this.getStoreHours();
        const dayHours = hours[dayName];

        if (!dayHours || dayHours.closed) {
            return false;
        }

        const timeMinutes = this.timeToMinutes(time);
        const openMinutes = this.timeToMinutes(dayHours.open);
        const closeMinutes = this.timeToMinutes(dayHours.close);

        return timeMinutes >= openMinutes && timeMinutes < closeMinutes;
    },

    // Get available time slots for a date
    getAvailableSlots(date, serviceDuration = 30) {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
        const hours = this.getStoreHours();
        const dayHours = hours[dayName];

        if (!dayHours || dayHours.closed) {
            return [];
        }

        const slots = [];
        const openMinutes = this.timeToMinutes(dayHours.open);
        const closeMinutes = this.timeToMinutes(dayHours.close);

        // Generate 15-minute slots
        // Last valid slot is when there's enough time for the service before closing
        const lastValidSlot = closeMinutes - serviceDuration;

        for (let minutes = openMinutes; minutes <= lastValidSlot; minutes += 15) {
            const time = this.minutesToTime(minutes);

            // Check if this slot is available (not blocked and no conflicts)
            if (!this.isSlotConflicting(date, time, serviceDuration)) {
                slots.push(time);
            }
        }

        return slots;
    },

    // Check if a time slot conflicts with existing appointments or blocked times
    isSlotConflicting(date, time, duration) {
        // Check if blocked by owner
        if (this.isTimeBlockedByOwner(date, time, duration)) {
            return true;
        }

        // Check for conflicts with existing appointments
        const appointments = this.getAppointmentsByDate(date);
        const slotStartMinutes = this.timeToMinutes(time);
        const slotEndMinutes = slotStartMinutes + duration;

        for (const apt of appointments) {
            const aptStartMinutes = this.timeToMinutes(apt.time);

            // For appointments with active periods, only check active times
            if (apt.activePeriods && apt.activePeriods.length > 0) {
                for (const period of apt.activePeriods) {
                    const periodStart = aptStartMinutes + period.start;
                    const periodEnd = aptStartMinutes + period.end;

                    // Check if there's any overlap with active period
                    if (slotStartMinutes < periodEnd && slotEndMinutes > periodStart) {
                        return true;
                    }
                }
            } else {
                // For regular appointments, check the entire duration
                const aptEndMinutes = aptStartMinutes + (apt.totalDuration || 30);

                // Check if there's any overlap
                if (slotStartMinutes < aptEndMinutes && slotEndMinutes > aptStartMinutes) {
                    return true;
                }
            }
        }

        return false;
    },

    // Helper: Convert time string to minutes
    timeToMinutes(time) {
        if (!time) return 0;
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    },

    // Helper: Convert minutes to time string
    minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    },

    // Helper: Format time for display (12-hour format)
    formatTime(time) {
        if (!time) return '';
        const [hours, minutes] = time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
    },

    // Store hours management
    getStoreHours() {
        const stored = localStorage.getItem('storeHours');
        return stored ? JSON.parse(stored) : this.defaultStoreHours;
    },

    saveStoreHours(hours) {
        localStorage.setItem('storeHours', JSON.stringify(hours));

        // Trigger storage event
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'storeHours',
            newValue: JSON.stringify(hours),
            url: window.location.href
        }));
    },

    // Services management
    getServices() {
        const stored = localStorage.getItem('services');
        return stored ? JSON.parse(stored) : this.defaultServices;
    },

    saveServices(services) {
        localStorage.setItem('services', JSON.stringify(services));

        // Trigger storage event
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'services',
            newValue: JSON.stringify(services),
            url: window.location.href
        }));
    },

    // Get week start (Sunday) for a given date
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        const result = new Date(d.setDate(diff));
        result.setHours(0, 0, 0, 0);
        return result;
    },

    // Get service color
    getServiceColor(serviceId) {
        // Check if it's a default service
        if (this.serviceColors[serviceId]) {
            return this.serviceColors[serviceId];
        }

        const services = this.getServices();

        // If it's a custom service, use color from palette
        // Assign a color from the palette for custom services
        const customServices = Object.keys(services).filter(id =>
            !this.defaultServices[id]
        );
        const customIndex = customServices.indexOf(serviceId);

        if (customIndex >= 0) {
            return this.colorPalette[customIndex % this.colorPalette.length];
        }

        // Default color if not found
        return '#757575';
    },

    // Get all services with their colors
    getServicesWithColors() {
        const services = this.getServices();
        const result = {};

        Object.keys(services).forEach(serviceId => {
            result[serviceId] = {
                ...services[serviceId],
                color: this.getServiceColor(serviceId)
            };
        });

        return result;
    },

    // Blocked times management
    getBlockedTimes() {
        const stored = localStorage.getItem('blockedTimes');
        return stored ? JSON.parse(stored) : [];
    },

    saveBlockedTime(block) {
        const blockedTimes = this.getBlockedTimes();
        block.id = 'BLOCK' + Date.now();
        block.createdAt = new Date().toISOString();
        blockedTimes.push(block);
        localStorage.setItem('blockedTimes', JSON.stringify(blockedTimes));

        // Trigger storage event
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'blockedTimes',
            newValue: JSON.stringify(blockedTimes),
            url: window.location.href
        }));

        return block.id;
    },

    deleteBlockedTime(blockId) {
        const blockedTimes = this.getBlockedTimes();
        const filtered = blockedTimes.filter(block => block.id !== blockId);
        localStorage.setItem('blockedTimes', JSON.stringify(filtered));

        // Trigger storage event
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'blockedTimes',
            newValue: JSON.stringify(filtered),
            url: window.location.href
        }));
    },

    // Check if a time is blocked by owner
    isTimeBlockedByOwner(date, time, duration = 0) {
        const blockedTimes = this.getBlockedTimes();

        // Convert date to YYYY-MM-DD format
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const checkStartMinutes = this.timeToMinutes(time);
        const checkEndMinutes = checkStartMinutes + duration;

        return blockedTimes.some(block => {
            if (block.date !== dateStr) return false;

            const blockStartMinutes = this.timeToMinutes(block.startTime);
            const blockEndMinutes = this.timeToMinutes(block.endTime);

            // Check if there's any overlap
            return (checkStartMinutes < blockEndMinutes && checkEndMinutes > blockStartMinutes);
        });
    },

    // Get blocked times for a specific date
    getBlockedTimesByDate(date) {
        const blockedTimes = this.getBlockedTimes();

        // Convert date to YYYY-MM-DD format
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        return blockedTimes.filter(block => block.date === dateStr);
    }
};