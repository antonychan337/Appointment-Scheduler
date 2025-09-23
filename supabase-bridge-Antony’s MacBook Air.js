// Supabase Bridge - Replaces SharedData.js with Supabase backend
// This maintains the same API as SharedData.js for compatibility

const SUPABASE_URL = 'https://zpgebfbzdmahlbhjbvvk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwZ2ViZmJ6ZG1haGxiaGpidnZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MDYxNzAsImV4cCI6MjA3Mzk4MjE3MH0.KtiKm9TdgedUXKXMQQxYNzeFbKAgKbqP2_0IhI_AFHA';

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    },
    global: {
        headers: {
            'Accept': 'application/json'
        }
    }
});

// Current shop and user context
let currentShopId = null;
let currentUser = null;

// Initialize or get shop ID from localStorage (temporary for migration)
function initializeShopContext() {
    // Check if we have a shop ID in localStorage from a previous session
    const savedShopId = localStorage.getItem('supabase_shop_id');
    if (savedShopId) {
        currentShopId = savedShopId;
    }
    return currentShopId;
}

// Helper function to find and set current shop ID
async function getCurrentShopId(user) {
    console.log('getCurrentShopId called for user:', user?.email);

    // 1. First check localStorage
    const savedShopId = localStorage.getItem('supabase_shop_id');
    console.log('Saved shop ID from localStorage:', savedShopId);
    if (savedShopId && savedShopId !== 'null' && savedShopId !== 'undefined') {
        console.log('Using shop ID from localStorage:', savedShopId);
        return savedShopId;
    }

    if (!user || !user.email) {
        console.log('No user or email, cannot find shop');
        return null;
    }

    // 2. Try to find shop by email
    try {
        console.log('Attempting to find shop by email:', user.email);
        const { data: shops, error: shopError } = await supabaseClient
            .from('shops')
            .select('id, name')
            .eq('email', user.email);

        console.log('Shop query result:', { shops, shopError });

        if (shopError) {
            console.error('Error querying shops table:', shopError);
            // If it's a 406 error, the table might not exist or have wrong schema
            if (shopError.code === '406') {
                console.error('406 error - possible schema mismatch in shops table');
            }
        } else if (shops && shops.length > 0) {
            const shopId = shops[0].id;
            console.log('Found shop:', shops[0].name, 'with ID:', shopId);
            localStorage.setItem('supabase_shop_id', shopId);
            return shopId;
        }
    } catch (error) {
        console.error('Exception finding shop by email:', error);
    }

    // 3. Try to find shop via barbers table (user might be owner)
    try {
        console.log('Attempting to find shop via barbers table');
        const { data: barber, error: barberError } = await supabaseClient
            .from('barbers')
            .select('shop_id')
            .eq('profile_id', user.id)
            .eq('is_owner', true)
            .single();

        console.log('Barber query result:', { barber, barberError });

        if (!barberError && barber?.shop_id) {
            console.log('Found shop via barbers table:', barber.shop_id);
            localStorage.setItem('supabase_shop_id', barber.shop_id);
            return barber.shop_id;
        }
    } catch (error) {
        console.error('Exception finding shop via barbers:', error);
    }

    console.log('No shop found for user');
    return null;
}

// Replacement for SharedData object
const SharedData = {
    // Initialize the bridge
    async initialize() {
        console.log('SharedData.initialize() called');
        try {
            // Check if user is logged in
            const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

            if (authError) {
                console.error('Auth error:', authError);
                return;
            }

            if (user) {
                console.log('User authenticated:', user.email);
                currentUser = user;

                // Get shop ID using helper function
                currentShopId = await getCurrentShopId(user);
                console.log('Current shop ID after initialization:', currentShopId);
            } else {
                console.log('No authenticated user');
                // For testing without auth, use saved shop ID
                initializeShopContext();
            }

            // Load initial data into cache
            if (currentShopId) {
                console.log('Loading initial data for shop:', currentShopId);
                this.barbersCache = await this.getBarbers();
                this.appointmentsCache = await this.getAppointments();
                this.servicesCache = await this.getServices();
            } else {
                console.warn('No shop ID available, skipping data load');
            }
        } catch (error) {
            console.error('Initialization error:', error);
            initializeShopContext();
        }
    },

    // AUTHENTICATION
    async signUp(email, password, shopName, ownerName, additionalData = {}) {
        try {
            // Sign up user
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        shop_name: shopName,
                        owner_name: ownerName
                    }
                }
            });

            if (authError) throw authError;

            // Parse owner name if it's a full name
            let firstName = '';
            let lastName = '';
            if (ownerName) {
                const nameParts = ownerName.split(' ');
                firstName = nameParts[0] || '';
                lastName = nameParts.slice(1).join(' ') || '';
            }

            // Create shop with complete information
            const { data: shop, error: shopError } = await supabaseClient
                .from('shops')
                .insert({
                    name: shopName,
                    email: email,
                    owner_first_name: additionalData.firstName || firstName,
                    owner_last_name: additionalData.lastName || lastName,
                    address: additionalData.address || '',
                    phone: additionalData.phone || '',
                    wechat_id: additionalData.wechatId || ''
                })
                .select()
                .single();

            if (shopError) throw shopError;

            currentShopId = shop.id;
            console.log('Shop created with ID:', currentShopId);
            localStorage.setItem('supabase_shop_id', currentShopId);

            // Skip profile update - we don't need a separate profiles table
            // Shop ID is stored in localStorage and shop is linked by email

            // Display info is now stored directly in the shops table
            // No need for separate shop_settings insert

            // Create owner as default barber with full name
            const fullOwnerName = additionalData.firstName && additionalData.lastName
                ? `${additionalData.firstName} ${additionalData.lastName}`
                : ownerName;

            await supabaseClient
                .from('barbers')
                .insert({
                    shop_id: shop.id,
                    name: fullOwnerName,
                    is_owner: true,
                    uses_store_hours: true,
                    service_ids: [],  // Will be populated during setup
                    is_active: true
                });

            return { success: true, shop, user: authData.user };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error };
        }
    },

    async signIn(email, password) {
        console.log('signIn called for:', email);
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            currentUser = data.user;
            console.log('User signed in successfully:', data.user.email);

            // Use the helper function to find shop ID
            currentShopId = await getCurrentShopId(data.user);
            console.log('Shop ID after sign in:', currentShopId);

            return { success: true, user: data.user };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error };
        }
    },

    async signOut() {
        await supabaseClient.auth.signOut();
        currentUser = null;
        currentShopId = null;
        localStorage.removeItem('supabase_shop_id');
    },

    // Manual shop ID setter for debugging
    setCurrentShopId(shopId) {
        console.log('Manually setting shop ID to:', shopId);
        currentShopId = shopId;
        localStorage.setItem('supabase_shop_id', shopId);
        return shopId;
    },

    getCurrentShopId() {
        // Return currentShopId if available, otherwise check localStorage
        if (currentShopId) {
            return currentShopId;
        }

        // Try to get from localStorage as fallback
        const savedShopId = localStorage.getItem('supabase_shop_id');
        if (savedShopId && savedShopId !== 'null' && savedShopId !== 'undefined') {
            currentShopId = savedShopId;
            return savedShopId;
        }

        return null;
    },

    // BARBERS
    async getBarbers() {
        console.log('getBarbers called, currentShopId:', currentShopId);
        if (!currentShopId) {
            console.warn('No shop ID available. User may not be logged in or shop not found.');
            console.log('Returning default barber');
            return [{
                id: 'owner',
                name: 'Owner',
                isOwner: true,
                services: {},
                hours: await this.getStoreHours(),
                usesStoreHours: true
            }];
        }

        try {
            const { data, error } = await supabaseClient
                .from('barbers')
                .select('*')
                .eq('shop_id', currentShopId)
                .eq('is_active', true)
                .order('display_order');

            if (error) throw error;

            // Transform to match existing format
            return (data || []).map(barber => ({
                id: barber.id,
                name: barber.name,
                title: barber.title,
                isOwner: barber.is_owner,
                // Transform service_ids array to services object with boolean values
                services: Array.isArray(barber.service_ids)
                    ? barber.service_ids.reduce((acc, id) => { acc[id] = true; return acc; }, {})
                    : (barber.service_ids || {}),
                hours: barber.working_hours || this.getStoreHours(),
                usesStoreHours: barber.uses_store_hours || barber.is_owner // Owner uses store hours by default
            }));
        } catch (error) {
            console.error('Error fetching barbers:', error);
            return [];
        }
    },

    getBarberById(barberId) {
        // Synchronous version - returns from cache or makes async call
        const barbers = this.barbersCache || [];
        return barbers.find(b => b.id === barberId) || null;
    },

    async addBarber(name, copyFromId = null) {
        // Now properly async - creates barber and returns the actual ID
        if (!currentShopId) {
            console.error('No shop ID available');
            return null;
        }

        // Get barber to copy from if specified
        let barberData = {
            shop_id: currentShopId,
            name: name,
            is_owner: false,
            is_active: true,
            working_hours: this.getStoreHours()
        };

        if (copyFromId && this.barbersCache) {
            const copyFrom = this.barbersCache.find(b => b.id === copyFromId);
            if (copyFrom) {
                barberData.working_hours = copyFrom.hours;
                barberData.service_ids = Object.keys(copyFrom.services || {});
            }
        }

        try {
            const { data, error } = await supabaseClient
                .from('barbers')
                .insert(barberData)
                .select()
                .single();

            if (error) throw error;

            // Refresh cache
            const refreshedBarbers = await this.getBarbers();
            this.barbersCache = refreshedBarbers;

            // Update global barbers array
            if (window.barbers !== undefined) {
                window.barbers = Array.isArray(refreshedBarbers) ? refreshedBarbers : [];
            }

            // Return the new barber's ID
            return data.id;
        } catch (error) {
            console.error('Error creating barber:', error);
            return null;
        } // Return temporary ID for immediate UI update
    },

    async updateBarber(barberId, updates) {
        if (!currentShopId) return false;

        try {
            const updateData = {};

            // Map the updates to database columns
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.title !== undefined) updateData.title = updates.title;
            if (updates.services !== undefined) {
                // Convert services object to array of IDs
                updateData.service_ids = Object.keys(updates.services).filter(id => updates.services[id]);
            }
            if (updates.hours !== undefined) updateData.working_hours = updates.hours;
            if (updates.isOwner !== undefined) updateData.is_owner = updates.isOwner;
            if (updates.usesStoreHours !== undefined) updateData.uses_store_hours = updates.usesStoreHours;

            const { error } = await supabaseClient
                .from('barbers')
                .update(updateData)
                .eq('id', barberId);

            if (error) throw error;

            // Refresh cache
            const refreshedBarbers = await this.getBarbers();
            this.barbersCache = refreshedBarbers;

            // Update global barbers array if it exists
            if (window.barbers !== undefined) {
                window.barbers = Array.isArray(refreshedBarbers) ? refreshedBarbers : [];
            }

            return true;
        } catch (error) {
            console.error('Error updating barber:', error);
            return false;
        }
    },

    async deleteBarber(barberId) {
        if (!currentShopId) return false;

        try {
            const { error } = await supabaseClient
                .from('barbers')
                .update({ is_active: false }) // Soft delete
                .eq('id', barberId);

            if (error) throw error;

            // Refresh cache
            const refreshedBarbers = await this.getBarbers();
            this.barbersCache = refreshedBarbers;

            // Update global barbers array
            if (window.barbers !== undefined) {
                window.barbers = Array.isArray(refreshedBarbers) ? refreshedBarbers : [];
            }

            return true;
        } catch (error) {
            console.error('Error deleting barber:', error);
            return false;
        }
    },

    async saveBarbers(barbers) {
        if (!currentShopId) return;

        try {
            // Update each barber
            for (const barber of barbers) {
                if (barber.id && barber.id !== 'new') {
                    // Update existing
                    await supabaseClient
                        .from('barbers')
                        .update({
                            name: barber.name,
                            title: barber.title,
                            is_owner: barber.isOwner,
                            service_ids: Object.keys(barber.services || {}),
                            working_hours: barber.hours,
                            display_order: barbers.indexOf(barber)
                        })
                        .eq('id', barber.id);
                } else {
                    // Insert new
                    await supabaseClient
                        .from('barbers')
                        .insert({
                            shop_id: currentShopId,
                            name: barber.name,
                            title: barber.title,
                            is_owner: barber.isOwner,
                            service_ids: Object.keys(barber.services || {}),
                            working_hours: barber.hours,
                            display_order: barbers.indexOf(barber)
                        });
                }
            }

            // Refresh cache
            this.barbersCache = await this.getBarbers();
        } catch (error) {
            console.error('Error saving barbers:', error);
        }
    },

    // SERVICES
    async getServices() {
        if (!currentShopId) {
            // Return default services for demo
            return this.defaultServices;
        }

        try {
            const { data, error } = await supabaseClient
                .from('services')
                .select('*')
                .eq('shop_id', currentShopId)
                .order('display_order');

            if (error) throw error;

            // Transform to match existing format (object instead of array)
            const services = {};
            (data || []).forEach(service => {
                services[service.id] = {
                    name: service.name,
                    name_zh: service.name_zh,
                    duration: service.duration,
                    price: service.price,
                    enabled: service.enabled,
                    hasActiveTime: service.has_active_time,
                    activePeriods: service.active_periods,
                    color: service.color
                };
            });

            // Cache services for synchronous access
            this.servicesCache = services;
            return services;
        } catch (error) {
            console.error('Error fetching services:', error);
            return {};
        }
    },

    async saveServices(services) {
        if (!currentShopId) return;

        try {
            // Get existing services to determine which to update vs insert
            const { data: existing } = await supabaseClient
                .from('services')
                .select('id')
                .eq('shop_id', currentShopId);

            const existingIds = (existing || []).map(s => s.id);

            for (const [serviceId, service] of Object.entries(services)) {
                const serviceData = {
                    name: service.name,
                    name_zh: service.name_zh,
                    duration: service.duration,
                    price: service.price,
                    enabled: service.enabled,
                    has_active_time: service.hasActiveTime,
                    active_periods: service.activePeriods,
                    color: service.color
                };

                if (existingIds.includes(serviceId)) {
                    // Update existing
                    await supabaseClient
                        .from('services')
                        .update(serviceData)
                        .eq('id', serviceId);
                } else {
                    // Insert new
                    await supabaseClient
                        .from('services')
                        .insert({
                            shop_id: currentShopId,
                            ...serviceData
                        });
                }
            }
        } catch (error) {
            console.error('Error saving services:', error);
        }
    },

    getServicesWithColors() {
        // Synchronous version that returns services with colors
        const services = this.servicesCache || this.defaultServices;
        const servicesWithColors = {};

        for (const [id, service] of Object.entries(services)) {
            servicesWithColors[id] = {
                ...service,
                color: service.color || this.serviceColors[id] || '#2196F3'
            };
        }

        return servicesWithColors;
    },

    // APPOINTMENTS
    async getAppointments() {
        if (!currentShopId) return [];

        try {
            const { data, error } = await supabaseClient
                .from('appointments')
                .select('*')
                .eq('shop_id', currentShopId)
                .eq('status', 'confirmed')
                .order('appointment_date')
                .order('start_time');

            if (error) throw error;

            // Transform to match existing format
            const appointments = (data || []).map(apt => ({
                id: apt.id,
                barberId: apt.barber_id,
                customerName: apt.customer_name,
                customerPhone: apt.customer_phone,
                customerEmail: apt.customer_email,
                services: apt.service_ids,
                date: apt.appointment_date,
                time: apt.start_time,
                endTime: apt.end_time,
                status: apt.status,
                notes: apt.customer_notes,
                createdAt: apt.created_at
            }));

            // Cache appointments for synchronous access
            this.appointmentsCache = appointments;
            return appointments;
        } catch (error) {
            console.error('Error fetching appointments:', error);
            return [];
        }
    },

    getAppointmentsByDate(date) {
        // Synchronous version using cache
        if (!this.appointmentsCache || this.appointmentsCache === null) {
            // Return empty array if not loaded yet
            return [];
        }

        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        return this.appointmentsCache.filter(apt => apt.date === dateStr);
    },

    getAppointmentsByBarberAndDate(barberId, date) {
        // Synchronous version using cache
        if (!this.appointmentsCache || this.appointmentsCache === null) {
            // Return empty array if not loaded yet
            return [];
        }

        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        return this.appointmentsCache.filter(apt =>
            apt.barberId === barberId && apt.date === dateStr
        );
    },

    async saveAppointments(appointments) {
        // Not used in current implementation
        console.warn('saveAppointments called but not implemented for Supabase');
    },

    async addAppointment(appointment) {
        if (!currentShopId) return null;

        try {
            // Calculate end time
            const services = await this.getServices();
            const totalDuration = appointment.services.reduce((sum, sId) => {
                const service = services[sId];
                return sum + (service ? service.duration : 0);
            }, 0);

            const [hours, minutes] = appointment.time.split(':').map(Number);
            const endHours = Math.floor((hours * 60 + minutes + totalDuration) / 60);
            const endMinutes = (hours * 60 + minutes + totalDuration) % 60;
            const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

            const { data, error } = await supabaseClient
                .from('appointments')
                .insert({
                    shop_id: currentShopId,
                    barber_id: appointment.barberId,
                    customer_name: appointment.customerName,
                    customer_phone: appointment.customerPhone,
                    customer_email: appointment.customerEmail,
                    customer_notes: appointment.notes,
                    service_ids: appointment.services,
                    appointment_date: appointment.date,
                    start_time: appointment.time,
                    end_time: endTime,
                    status: 'confirmed',
                    total_price: appointment.totalPrice
                })
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error adding appointment:', error);
            return null;
        }
    },

    async cancelAppointment(appointmentId) {
        try {
            const { error } = await supabaseClient
                .from('appointments')
                .update({
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString()
                })
                .eq('id', appointmentId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            return false;
        }
    },

    // STORE HOURS
    async getStoreHours() {
        // Try to get shop ID if not set
        if (!currentShopId) {
            currentShopId = this.getCurrentShopId();
        }

        if (!currentShopId) {
            console.warn('No shop ID available for getStoreHours');
            return this.defaultStoreHours;
        }

        try {
            const { data, error } = await supabaseClient
                .from('shops')
                .select('store_hours')
                .eq('id', currentShopId)
                .maybeSingle();

            if (error) {
                // If it's a missing column error (400), return defaults
                if (error.code === '42703' || error.message?.includes('column') || error.code === '400') {
                    console.warn('store_hours column missing in shops table, using defaults');
                    return this.defaultStoreHours;
                }
                // If it's "no rows found", that's okay
                if (error.code !== 'PGRST116') {
                    console.error('Error fetching store hours:', error);
                }
                return this.defaultStoreHours;
            }

            // If no store hours exist, try to update (but don't fail if column doesn't exist)
            if (!data?.store_hours) {
                try {
                    await supabaseClient
                        .from('shops')
                        .update({
                            store_hours: this.defaultStoreHours
                        })
                        .eq('id', currentShopId);
                } catch (updateError) {
                    console.warn('Could not update store_hours, column may not exist');
                }
                return this.defaultStoreHours;
            }

            console.log('Store hours loaded from database:', data.store_hours);
            return data.store_hours || this.defaultStoreHours;
        } catch (error) {
            console.error('Error fetching store hours:', error);
            return this.defaultStoreHours;
        }
    },

    async saveStoreHours(hours) {
        if (!currentShopId) return;

        try {
            const { error } = await supabaseClient
                .from('shops')
                .update({
                    store_hours: hours
                })
                .eq('id', currentShopId);

            if (error) {
                // If column doesn't exist, log warning but don't throw
                if (error.code === '42703' || error.message?.includes('column')) {
                    console.warn('store_hours column does not exist in shops table. Run migration to fix.');
                } else {
                    console.error('Error saving store hours:', error);
                }
            }
        } catch (error) {
            console.error('Error saving store hours:', error);
        }
    },

    // BOOKING POLICIES
    async getBookingPolicies() {
        const defaultPolicies = {
            minBookingHours: 2,
            maxBookingDays: 30,
            cancellationHours: 24
        };

        if (!currentShopId) {
            return defaultPolicies;
        }

        try {
            const { data, error } = await supabaseClient
                .from('shops')
                .select('min_booking_hours, max_booking_days, cancellation_notice_hours')
                .eq('id', currentShopId)
                .maybeSingle();

            if (error) {
                // If columns don't exist (400 error), use defaults
                if (error.code === '42703' || error.message?.includes('column') || error.code === '400') {
                    console.warn('Booking policy columns missing in shops table, using defaults');
                    return defaultPolicies;
                }
                // If it's "no rows found", that's okay
                if (error.code !== 'PGRST116') {
                    console.error('Error fetching booking policies:', error);
                }
                return defaultPolicies;
            }

            return {
                minBookingHours: data?.min_booking_hours || 2,
                maxBookingDays: data?.max_booking_days || 30,
                cancellationHours: data?.cancellation_notice_hours || 24
            };
        } catch (error) {
            console.error('Error fetching booking policies:', error);
            return defaultPolicies;
        }
    },

    async saveBookingPolicies(policies) {
        if (!currentShopId) return;

        try {
            const { error } = await supabaseClient
                .from('shops')
                .update({
                    min_booking_hours: policies.minBookingHours,
                    max_booking_days: policies.maxBookingDays,
                    cancellation_notice_hours: policies.cancellationHours
                })
                .eq('id', currentShopId);

            if (error) {
                // If columns don't exist, log warning but don't throw
                if (error.code === '42703' || error.message?.includes('column')) {
                    console.warn('Booking policy columns do not exist in shops table. Run migration to fix.');
                } else {
                    console.error('Error saving booking policies:', error);
                }
            }
        } catch (error) {
            console.error('Error saving booking policies:', error);
        }
    },

    // AVAILABILITY CHECKING
    isTimeSlotBooked(date, time, duration, barberId) {
        // This needs to be async in real implementation
        // For now, return false to allow all bookings
        return false;
    },

    // OWNER PROFILE
    async getOwnerProfile() {
        // Get owner profile from shop data instead of profiles table
        if (!currentShopId) return {};

        try {
            const { data: shop, error } = await supabaseClient
                .from('shops')
                .select('*')
                .eq('id', currentShopId)
                .single();

            if (error) throw error;

            return {
                firstName: shop?.owner_first_name || '',
                lastName: shop?.owner_last_name || '',
                email: shop?.email || currentUser?.email || '',
                phone: shop?.phone || ''
            };
        } catch (error) {
            console.error('Error fetching owner profile:', error);
            return {};
        }
    },

    async saveOwnerProfile(profile) {
        // Save owner profile to shop data instead of profiles table
        if (!currentShopId) return;

        try {
            await supabaseClient
                .from('shops')
                .update({
                    owner_first_name: profile.firstName,
                    owner_last_name: profile.lastName,
                    phone: profile.phone
                })
                .eq('id', currentShopId);
        } catch (error) {
            console.error('Error saving owner profile:', error);
        }
    },

    // LANGUAGE
    getLanguage() {
        return localStorage.getItem('language') || 'en';
    },

    setLanguage(lang) {
        localStorage.setItem('language', lang);
    },

    getPreferredLanguage() {
        return localStorage.getItem('preferredLanguage') || 'en';
    },

    setPreferredLanguage(lang) {
        localStorage.setItem('preferredLanguage', lang);
    },

    // PROFILE & SHOP DATA
    async getProfile() {
        // Try to get shop ID if not set
        if (!currentShopId) {
            currentShopId = this.getCurrentShopId();
        }

        if (!currentShopId) {
            console.warn('Cannot get profile: No shop ID available');
            console.log('Hint: Make sure you are logged in and have completed setup');
            return null;
        }

        console.log('Loading profile for shop:', currentShopId);

        try {
            // First get only the columns we know exist
            const { data: shop, error } = await supabaseClient
                .from('shops')
                .select('id, name, email, created_at')
                .eq('id', currentShopId)
                .single();

            if (error) {
                console.error('Error loading basic shop data:', error);
                return null;
            }

            if (!shop) {
                console.warn('No shop data found for ID:', currentShopId);
                return null;
            }

            // Now try to get extended fields, but handle missing columns gracefully
            let extendedData = {};
            try {
                const { data: fullShop } = await supabaseClient
                    .from('shops')
                    .select('address, phone, owner_first_name, owner_last_name, wechat_id, display_info')
                    .eq('id', currentShopId)
                    .single();

                if (fullShop) {
                    extendedData = fullShop;
                    console.log('✅ Extended profile data loaded');
                }
            } catch (extError) {
                console.warn('Extended profile fields not available. Using defaults.');
            }

            console.log('✅ Profile loaded successfully:', shop.name);

            // Use defaults for any missing fields
            const displayInfo = extendedData.display_info || {
                showPhone: true,
                showEmail: true,
                showAddress: true,
                showWechat: false
            };

            return {
                storeName: shop.name,
                storeAddress: extendedData.address || '',
                phone: extendedData.phone || '',
                email: shop.email || '',
                firstName: extendedData.owner_first_name || '',
                lastName: extendedData.owner_last_name || '',
                wechatId: extendedData.wechat_id || '',
                displayInfo: displayInfo
            };
        } catch (error) {
            console.error('Error getting profile:', error);
            return null;
        }
    },

    async saveProfile(profile) {
        if (!currentShopId) {
            console.error('Cannot save profile: No shop ID available');
            return false;
        }

        console.log('Saving profile data:', profile);

        try {
            // First, update basic fields that we know exist
            const basicUpdate = {
                name: profile.storeName,
                email: profile.email
            };

            const { error: basicError } = await supabaseClient
                .from('shops')
                .update(basicUpdate)
                .eq('id', currentShopId);

            if (basicError) {
                console.error('Error updating basic shop info:', basicError);
                return false;
            }

            // Try to update extended fields, but don't fail if columns don't exist
            const extendedFields = [
                { column: 'address', value: profile.storeAddress },
                { column: 'phone', value: profile.phone },
                { column: 'owner_first_name', value: profile.firstName },
                { column: 'owner_last_name', value: profile.lastName },
                { column: 'wechat_id', value: profile.wechatId },
                { column: 'display_info', value: profile.displayInfo }
            ];

            let missingColumns = [];
            for (const field of extendedFields) {
                if (field.value !== undefined) {
                    try {
                        const { error } = await supabaseClient
                            .from('shops')
                            .update({ [field.column]: field.value })
                            .eq('id', currentShopId);

                        if (error && error.code === '42703') {
                            missingColumns.push(field.column);
                        }
                    } catch (err) {
                        // Silently handle column errors
                    }
                }
            }

            if (missingColumns.length > 0) {
                console.warn(`Some fields could not be saved (missing columns): ${missingColumns.join(', ')}`);
                console.log('To fix: Run the migration script in your Supabase SQL Editor');
            }

            console.log('✅ Profile saved (partial if columns missing)');
            return true;
        } catch (error) {
            console.error('Error saving profile:', error);
            return false;
        }
    },

    // BLOCKED TIMES
    async getBlockedTimes() {
        if (!currentShopId) return [];

        try {
            const { data, error } = await supabaseClient
                .from('blocked_times')
                .select('*')
                .eq('shop_id', currentShopId)
                .order('start_datetime');

            if (error) throw error;

            return (data || []).map(block => ({
                id: block.id,
                barberId: block.barber_id,
                date: block.start_datetime.split('T')[0],
                startTime: new Date(block.start_datetime).toTimeString().slice(0, 5),
                endTime: new Date(block.end_datetime).toTimeString().slice(0, 5),
                reason: block.reason
            }));
        } catch (error) {
            console.error('Error fetching blocked times:', error);
            return [];
        }
    },

    async addBlockedTime(blockedTime) {
        if (!currentShopId) return;

        try {
            const startDateTime = new Date(`${blockedTime.date}T${blockedTime.startTime}`);
            const endDateTime = new Date(`${blockedTime.date}T${blockedTime.endTime}`);

            await supabaseClient
                .from('blocked_times')
                .insert({
                    shop_id: currentShopId,
                    barber_id: blockedTime.barberId,
                    start_datetime: startDateTime.toISOString(),
                    end_datetime: endDateTime.toISOString(),
                    reason: blockedTime.reason,
                    block_type: 'other'
                });
        } catch (error) {
            console.error('Error adding blocked time:', error);
        }
    },

    // Default data for demo/fallback
    defaultStoreHours: {
        monday: { open: '09:00', close: '18:00', closed: false },
        tuesday: { open: '09:00', close: '18:00', closed: false },
        wednesday: { open: '09:00', close: '18:00', closed: false },
        thursday: { open: '09:00', close: '18:00', closed: false },
        friday: { open: '09:00', close: '20:00', closed: false },
        saturday: { open: '10:00', close: '17:00', closed: false },
        sunday: { open: '', close: '', closed: true }
    },

    defaultServices: {
        'mens-cut': {
            name: "Men's Cut",
            name_zh: "男士理发",
            duration: 30,
            price: 25,
            enabled: true,
            hasActiveTime: false,
            color: '#2196F3'
        },
        'womens-cut': {
            name: "Women's Cut",
            name_zh: "女士理发",
            duration: 45,
            price: 35,
            enabled: true,
            hasActiveTime: false,
            color: '#E91E63'
        },
        'kids-cut': {
            name: "Children's Cut",
            name_zh: "儿童理发",
            duration: 15,
            price: 15,
            enabled: true,
            hasActiveTime: false,
            color: '#4CAF50'
        }
    },

    // Cache for synchronous operations
    barbersCache: [],
    appointmentsCache: null,  // Initialize as null to detect unloaded state
    servicesCache: {},

    // Color palette for services
    serviceColors: {
        'mens-cut': '#2196F3',
        'womens-cut': '#E91E63',
        'kids-cut': '#4CAF50',
        'coloring': '#FF9800',
        'highlights': '#9C27B0'
    },

    // Utility functions
    timeToMinutes(time) {
        if (!time) return 0;
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    },

    minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
};

// Initialize on load
SharedData.initialize();