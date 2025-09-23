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

    // Staff/Barber Management
    getBarbers() {
        const stored = localStorage.getItem('barbers');
        if (!stored) {
            // Initialize with owner as default
            const ownerProfile = JSON.parse(localStorage.getItem('ownerProfile') || '{}');
            const defaultBarber = {
                id: 'owner',
                name: ownerProfile.firstName ? `${ownerProfile.firstName} ${ownerProfile.lastName || ''}`.trim() : 'Owner',
                isOwner: true,
                services: this.getServices(),
                hours: this.getStoreHours()
            };
            this.saveBarbers([defaultBarber]);
            return [defaultBarber];
        }
        return JSON.parse(stored);
    },

    saveBarbers(barbers) {
        localStorage.setItem('barbers', JSON.stringify(barbers));
    },

    getBarberById(barberId) {
        const barbers = this.getBarbers();
        return barbers.find(b => b.id === barberId);
    },

    addBarber(name, copyFromId = null) {
        const barbers = this.getBarbers();
        const newBarber = {
            id: 'BARBER_' + Date.now(),
            name: name,
            isOwner: false,
            services: {},
            hours: {}
        };

        if (copyFromId) {
            const sourceBarber = this.getBarberById(copyFromId);
            if (sourceBarber) {
                newBarber.services = JSON.parse(JSON.stringify(sourceBarber.services));
                newBarber.hours = JSON.parse(JSON.stringify(sourceBarber.hours));
            }
        } else {
            // Use store defaults
            newBarber.services = JSON.parse(JSON.stringify(this.defaultServices));
            newBarber.hours = JSON.parse(JSON.stringify(this.defaultStoreHours));
        }

        barbers.push(newBarber);
        this.saveBarbers(barbers);
        return newBarber.id;
    },

    updateBarber(barberId, updates) {
        const barbers = this.getBarbers();
        const index = barbers.findIndex(b => b.id === barberId);
        if (index !== -1) {
            barbers[index] = { ...barbers[index], ...updates };
            this.saveBarbers(barbers);
        }
    },

    deleteBarber(barberId) {
        if (barberId === 'owner') return false;
        const barbers = this.getBarbers();
        const filtered = barbers.filter(b => b.id !== barberId);
        this.saveBarbers(filtered);
        return true;
    },

    // Get services for a specific barber
    getBarberServices(barberId) {
        const barber = this.getBarberById(barberId);
        return barber ? barber.services : this.getServices();
    },

    // Get hours for a specific barber (respecting store hours)
    getBarberHours(barberId) {
        const barber = this.getBarberById(barberId);
        const storeHours = this.getStoreHours();

        if (!barber) return storeHours;

        // Ensure barber hours don't exceed store hours
        const barberHours = barber.hours || storeHours;
        const constrainedHours = {};

        Object.keys(storeHours).forEach(day => {
            if (storeHours[day].closed) {
                // Store is closed, barber must be closed too
                constrainedHours[day] = { open: '', close: '', closed: true };
            } else if (barberHours[day] && !barberHours[day].closed) {
                // Both open - use more restrictive hours
                const storeOpen = this.timeToMinutes(storeHours[day].open);
                const storeClose = this.timeToMinutes(storeHours[day].close);
                const barberOpen = this.timeToMinutes(barberHours[day].open);
                const barberClose = this.timeToMinutes(barberHours[day].close);

                constrainedHours[day] = {
                    open: this.minutesToTime(Math.max(storeOpen, barberOpen)),
                    close: this.minutesToTime(Math.min(storeClose, barberClose)),
                    closed: false
                };
            } else {
                constrainedHours[day] = barberHours[day] || storeHours[day];
            }
        });

        return constrainedHours;
    },

    // Get all appointments
    getAppointments() {
        const stored = localStorage.getItem('appointments');
        return stored ? JSON.parse(stored) : [];
    },

    // Get appointments for a specific date
    getAppointmentsByDate(date, barberId = null) {
        const appointments = this.getAppointments();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        let filtered = appointments.filter(apt => apt.date === dateStr);
        if (barberId) {
            filtered = filtered.filter(apt => apt.barberId === barberId);
        }
        return filtered;
    },

    // Save new appointment
    saveAppointment(appointment) {
        const appointments = this.getAppointments();
        // Only set ID if not already provided (owner app sets its own ID)
        if (!appointment.id) {
            appointment.id = 'APT' + Date.now() + Math.random().toString(36).substr(2, 5);
        }
        // Only set createdAt if not already provided
        if (!appointment.createdAt) {
            appointment.createdAt = new Date().toISOString();
        }
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
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
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
    getAvailableSlots(date, serviceDuration = 30, barberId = null) {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const hours = barberId ? this.getBarberHours(barberId) : this.getStoreHours();
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
            if (!this.isSlotConflicting(date, time, serviceDuration, barberId)) {
                slots.push(time);
            }
        }

        return slots;
    },

    // Check if a time slot conflicts with existing appointments or blocked times
    isSlotConflicting(date, time, duration, barberId = null) {
        // Check if blocked by owner (affects all barbers)
        if (this.isTimeBlockedByOwner(date, time, duration)) {
            return true;
        }

        // Check for conflicts with existing appointments
        const appointments = this.getAppointmentsByDate(date, barberId);
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

    // Alias for customer app compatibility
    isTimeSlotBooked(date, time, duration, barberId = null) {
        return this.isSlotConflicting(date, time, duration, barberId);
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
    },

    // Email Functions (with real email support for different types)
    sendEmail(type, appointment, oldAppointment = null) {
        // type can be: 'confirmation', 'rescheduled', 'cancelled'

        // Check owner's email preferences
        const emailPrefs = JSON.parse(localStorage.getItem('emailPreferences') || '{}');

        // Check if emails are enabled at all
        if (emailPrefs.enabled === false) {
            console.log('Email notifications disabled by owner');
            return;
        }

        // Check specific email type preference
        if (type === 'confirmation' && emailPrefs.confirmations === false) {
            console.log('Confirmation emails disabled by owner');
            return;
        }
        if (type === 'rescheduled' && emailPrefs.reschedules === false) {
            console.log('Reschedule emails disabled by owner');
            return;
        }
        if (type === 'cancelled' && emailPrefs.cancellations === false) {
            console.log('Cancellation emails disabled by owner');
            return;
        }

        // Check if EmailJS is configured
        const emailConfig = JSON.parse(localStorage.getItem('emailConfig') || '{}');
        if (!emailConfig.serviceId || !emailConfig.publicKey || !emailConfig.templateId) {
            console.warn('EmailJS not configured - skipping email send');
            return;
        }

        let baseUrl;

        // Check if we're running locally (file:// protocol)
        const isLocalTesting = window.location.protocol === 'file:';

        if (isLocalTesting) {
            // For local testing, always use the local file path
            const currentPath = window.location.pathname;

            // Clean up the path (remove any double slashes, etc.)
            let cleanPath = currentPath.replace(/\/+/g, '/');

            // Check if we're in customer-app or another page
            if (cleanPath.includes('customer-app.html')) {
                // Already in customer app, use current location
                baseUrl = 'file://' + cleanPath;
            } else {
                // In another page (owner app, test page, etc.)
                // Build path to customer-app.html
                const dirPath = cleanPath.substring(0, cleanPath.lastIndexOf('/'));
                baseUrl = 'file://' + dirPath + '/customer-app.html';
            }
        } else {
            // Production environment - use configured URL
            const bookingUrl = localStorage.getItem('bookingUrl');
            if (bookingUrl) {
                const urlData = JSON.parse(bookingUrl);
                baseUrl = `https://mycompany.com/${urlData.slug}`;
            } else {
                // Fallback to current location
                baseUrl = window.location.origin + '/customer-app.html';
            }
        }

        // Format date for display
        const appointmentDate = new Date(appointment.date + 'T00:00:00');
        const dateStr = appointmentDate.toLocaleDateString('en', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Get owner profile and cancellation policy (emailConfig already retrieved above)
        const ownerProfile = JSON.parse(localStorage.getItem('ownerProfile') || '{}');
        const cancellationPolicy = JSON.parse(localStorage.getItem('cancellationPolicy') || '{}');
        
        // Get customer's language preference (stored when they last used the app)
        const customerLang = localStorage.getItem(`customerLang_${appointment.customerEmail}`) || 'en';
        const isCustomerZh = customerLang === 'zh';

        // Create email HTML content
        const emailContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0; }
        .detail-row { margin: 10px 0; }
        .label { font-weight: bold; color: #666; }
        .value { color: #333; }
        .actions { margin-top: 30px; text-align: center; }
        .btn { display: inline-block; padding: 12px 30px; margin: 0 10px; text-decoration: none; border-radius: 5px; }
        .btn-modify { background: #4CAF50; color: white; }
        .btn-cancel { background: #f44336; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Appointment Confirmed!</h1>
        </div>
        <div class="content">
            <p>Dear ${appointment.customerName},</p>
            <p>Your appointment has been confirmed. Here are your booking details:</p>

            <div class="detail-row">
                <span class="label">Booking ID:</span>
                <span class="value">${appointment.id}</span>
            </div>

            <div class="detail-row">
                <span class="label">Services:</span>
                <span class="value">${appointment.serviceNames.join(', ')}</span>
            </div>

            <div class="detail-row">
                <span class="label">Date:</span>
                <span class="value">${dateStr}</span>
            </div>

            <div class="detail-row">
                <span class="label">Time:</span>
                <span class="value">${this.formatTime(appointment.time)}</span>
            </div>

            <div class="detail-row">
                <span class="label">Duration:</span>
                <span class="value">${appointment.totalDuration} minutes</span>
            </div>

            <div class="detail-row">
                <span class="label">Total Price:</span>
                <span class="value">$${appointment.totalPrice}</span>
            </div>

            <div class="actions">
                <a href="${baseUrl}?action=modify&bookingId=${appointment.id}" class="btn btn-modify">
                    Modify Appointment
                </a>
                <a href="${baseUrl}?action=cancel&bookingId=${appointment.id}" class="btn btn-cancel">
                    Cancel Appointment
                </a>
            </div>

            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                If you need to make any changes, click the buttons above or contact us directly.
            </p>
        </div>
    </div>
</body>
</html>
        `;

        // Try to send real email if EmailJS is configured
        if (typeof emailjs !== 'undefined' && emailConfig.serviceId) {
            // Get the appropriate template ID based on email type
            let templateId;
            if (type === 'confirmation' || type === 'rescheduled') {
                // Use the same template for both confirmation and rescheduled
                templateId = emailConfig.templateId || emailConfig.confirmationTemplateId;
            } else if (type === 'cancelled') {
                // Use the cancellation template (hardcoded for now)
                templateId = emailConfig.cancelledTemplateId || 'template_ppbr3sc';
            }

            if (!templateId) {
                console.warn(`No template ID configured for ${type} emails`);
                return;
            }

            // Format cancellation policy text
            let policyText = '';
            if (cancellationPolicy.minNoticeHours && cancellationPolicy.minNoticeHours > 0) {
                const hours = cancellationPolicy.minNoticeHours;
                if (hours === 1) {
                    policyText = isCustomerZh ? 
                        '取消政策：需要提前1小时通知' : 
                        'Cancellation Policy: 1 hour notice required';
                } else if (hours < 24) {
                    policyText = isCustomerZh ? 
                        `取消政策：需要提前${hours}小时通知` : 
                        `Cancellation Policy: ${hours} hours notice required`;
                } else {
                    const days = Math.floor(hours / 24);
                    policyText = isCustomerZh ? 
                        `取消政策：需要提前${days}天通知` : 
                        `Cancellation Policy: ${days} day${days > 1 ? 's' : ''} notice required`;
                }
            }

            // Prepare bilingual template parameters
            const templateParams = {
                to_email: appointment.customerEmail,
                customer_name: appointment.customerName,
                from_name: 'Book a Snip', // Platform name for sender
                business_name: ownerProfile.storeName || emailConfig.businessName || 'Premium Cuts Barbershop', // Actual barber shop name
                reply_to: emailConfig.replyTo || 'noreply@example.com',
                booking_id: appointment.id,
                barber_name: appointment.barberName || 'Staff',  // Add barber name
                services: appointment.serviceNames ? appointment.serviceNames.join(', ') : appointment.services.join(', '),
                date: dateStr,
                time: this.formatTime(appointment.time),
                duration: appointment.totalDuration + (isCustomerZh ? ' 分钟' : ' minutes'),
                price: '$' + appointment.totalPrice,
                cancellation_policy: policyText,
                // Bilingual headers
                email_subject: type === 'confirmation' ? 
                    (isCustomerZh ? '预约确认' : 'Appointment Confirmation') :
                    type === 'rescheduled' ? 
                    (isCustomerZh ? '预约已重新安排' : 'Appointment Rescheduled') :
                    (isCustomerZh ? '预约已取消' : 'Appointment Cancelled'),
                greeting: isCustomerZh ? `尊敬的${appointment.customerName}` : `Dear ${appointment.customerName}`,
                confirmation_message: isCustomerZh ? 
                    '您的预约已确认。以下是您的预约详情：' : 
                    'Your appointment has been confirmed. Here are your booking details:',
                label_booking_id: isCustomerZh ? '预约编号：' : 'Booking ID:',
                label_barber: isCustomerZh ? '理发师：' : 'Barber:',  // Add barber label
                label_services: isCustomerZh ? '服务项目：' : 'Services:',
                label_date: isCustomerZh ? '日期：' : 'Date:',
                label_time: isCustomerZh ? '时间：' : 'Time:',
                label_duration: isCustomerZh ? '时长：' : 'Duration:',
                label_price: isCustomerZh ? '价格：' : 'Total Price:',
                label_location: isCustomerZh ? '地址：' : 'Location:',
                label_contact: isCustomerZh ? '联系方式：' : 'Contact:',
                button_modify: isCustomerZh ? '修改预约' : 'Modify Appointment',
                button_cancel: isCustomerZh ? '取消预约' : 'Cancel Appointment',
                footer_message: isCustomerZh ?
                    '如需更改，请点击上面的按钮。' :
                    'If you need to make any changes, click the buttons above.',
                powered_by_text: isCustomerZh ? '预约服务由 Book a Snip 提供支持' : 'Booking powered by Book a Snip'
            };

            // For rescheduled appointments, modify the subject/content
            if (type === 'rescheduled' && oldAppointment) {
                const oldDate = new Date(oldAppointment.date + 'T00:00:00');
                const oldDateStr = oldDate.toLocaleDateString('en', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                // Add a note about the rescheduling in the services field
                templateParams.services = `RESCHEDULED - ${templateParams.services}\n(Previously: ${oldDateStr} at ${this.formatTime(oldAppointment.time)})`;
            }

            // Add type-specific parameters
            if (type === 'confirmation' || type === 'rescheduled') {
                templateParams.modify_link = `${baseUrl}?action=modify&bookingId=${appointment.id}`;
                templateParams.cancel_link = `${baseUrl}?action=cancel&bookingId=${appointment.id}`;
            }

            if (type === 'rescheduled' && oldAppointment) {
                // Add old appointment details for rescheduled email
                const oldDate = new Date(oldAppointment.date + 'T00:00:00');
                templateParams.old_date = oldDate.toLocaleDateString('en', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                templateParams.old_time = this.formatTime(oldAppointment.time);
                templateParams.old_services = oldAppointment.serviceNames ?
                    oldAppointment.serviceNames.join(', ') :
                    oldAppointment.services.join(', ');
            }

            if (type === 'cancelled') {
                templateParams.booking_link = baseUrl;
            }

            // Send email using EmailJS with the appropriate template
            emailjs.send(emailConfig.serviceId, templateId, templateParams)
                .then(function(response) {
                    console.log('✅ Email sent successfully!', response.status, response.text);

                    // Store sent email record
                    const sentEmails = JSON.parse(localStorage.getItem('sentEmails') || '[]');
                    const subjects = {
                        confirmation: 'Appointment Confirmation',
                        rescheduled: 'Appointment Rescheduled',
                        cancelled: 'Appointment Cancelled'
                    };
                    sentEmails.push({
                        to: appointment.customerEmail,
                        subject: subjects[type],
                        type: type,
                        sentAt: new Date().toISOString(),
                        appointmentId: appointment.id,
                        status: 'sent',
                        method: 'emailjs'
                    });
                    localStorage.setItem('sentEmails', JSON.stringify(sentEmails));
                })
                .catch(function(error) {
                    console.error('❌ Failed to send email:', error);
                    alert('Email could not be sent. Please check your email configuration.');
                });

            return true;
        } else {
            // Fallback: Show in console and store locally
            console.log('=== EMAIL CONFIRMATION (Demo Mode) ===');
            console.log('ℹ️ To send real emails, configure EmailJS in Settings');
            console.log('To:', appointment.customerEmail);
            console.log('Subject: Appointment Confirmation');
            console.log('Content:', emailContent);

            // Store sent emails
            const sentEmails = JSON.parse(localStorage.getItem('sentEmails') || '[]');
            sentEmails.push({
                to: appointment.customerEmail,
                subject: 'Appointment Confirmation',
                content: emailContent,
                sentAt: new Date().toISOString(),
                appointmentId: appointment.id,
                status: 'demo',
                method: 'console'
            });
            localStorage.setItem('sentEmails', JSON.stringify(sentEmails));

            // Show demo notification
            if (typeof alert !== 'undefined') {
                alert('Demo Mode: Email confirmation logged to console.\nTo send real emails, configure EmailJS in owner settings.');
            }

            return true;
        }
    },

    // Update appointment (for modification)
    updateAppointment(appointmentId, updates) {
        const appointments = this.getAppointments();
        const index = appointments.findIndex(apt => apt.id === appointmentId);

        if (index === -1) {
            return false;
        }

        // Update appointment
        appointments[index] = {
            ...appointments[index],
            ...updates,
            modifiedAt: new Date().toISOString()
        };

        localStorage.setItem('appointments', JSON.stringify(appointments));

        // Trigger storage event
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'appointments',
            newValue: JSON.stringify(appointments),
            url: window.location.href
        }));

        return true;
    },

    // Get appointment by ID
    getAppointmentById(appointmentId) {
        const appointments = this.getAppointments();
        return appointments.find(apt => apt.id === appointmentId);
    },

    // Convenience methods for specific email types
    sendConfirmationEmail(appointment) {
        this.sendEmail('confirmation', appointment);
    },

    sendRescheduledEmail(newAppointment, oldAppointment) {
        this.sendEmail('rescheduled', newAppointment, oldAppointment);
    },

    sendCancellationEmail(appointment) {
        this.sendEmail('cancelled', appointment);
    },

    // Booking policies management
    getBookingPolicies() {
        const policies = localStorage.getItem('bookingPolicies');
        if (policies) {
            return JSON.parse(policies);
        }
        // Default policies
        return {
            minBookingHours: 0,
            minCancelHours: 24,
            maxAdvanceDays: 60
        };
    },

    setBookingPolicies(policies) {
        localStorage.setItem('bookingPolicies', JSON.stringify(policies));
    },

    // Language preference management
    getPreferredLanguage() {
        return localStorage.getItem('preferredLanguage') || 'en';
    },

    setPreferredLanguage(lang) {
        localStorage.setItem('preferredLanguage', lang);
        // Dispatch storage event to notify other tabs
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'preferredLanguage',
            newValue: lang
        }));
    }
};