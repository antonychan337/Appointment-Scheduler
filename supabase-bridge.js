// Supabase Bridge - Replaces SharedData.js with Supabase backend
// This maintains the same API as SharedData.js for compatibility

// Note: SUPABASE_URL and SUPABASE_ANON_KEY should be defined in supabase-config.js
// If not defined, use defaults
if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
    console.error('SUPABASE_URL or SUPABASE_ANON_KEY not defined. Make sure supabase-config.js is loaded first.');
}

// Initialize Supabase client (only if not already initialized)
if (typeof supabaseClient === 'undefined') {
    const { createClient } = supabase;
    window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
}

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

                // Load critical caches first
                this.storeHoursCache = await this.loadStoreHours();
                this.bookingPoliciesCache = await this.loadBookingPolicies();
                console.log('Critical caches loaded:', {
                    storeHours: !!this.storeHoursCache,
                    bookingPolicies: !!this.bookingPoliciesCache
                });

                // Then load other data
                this.barbersCache = await this.getBarbers();
                this.appointmentsCache = await this.getAppointments();
                await this.loadServices();
            } else {
                console.warn('No shop ID available, loading default caches');
                // Load defaults even without shop ID
                this.storeHoursCache = this.defaultStoreHours;
                this.bookingPoliciesCache = {
                    minBookingHours: 2,
                    maxBookingDays: 30,
                    cancellationHours: 24
                };
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

    async resetPasswordForEmail(email) {
        console.log('resetPasswordForEmail called for:', email);
        try {
            const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/password-reset.html`
            });

            if (error) throw error;

            console.log('Password reset email sent successfully to:', email);
            return { success: true, data };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error };
        }
    },

    async updatePassword(newPassword) {
        console.log('updatePassword called');
        try {
            const { data, error } = await supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            console.log('Password updated successfully');
            return { success: true, data };
        } catch (error) {
            console.error('Update password error:', error);
            return { success: false, error };
        }
    },

    // Manual shop ID setter for debugging
    setCurrentShopId(shopId) {
        console.log('Manually setting shop ID to:', shopId);
        currentShopId = shopId;
        localStorage.setItem('supabase_shop_id', shopId);
        return shopId;
    },

    // Get shop ID from slug (for customer app)
    async getShopIdFromSlug(slug) {
        console.log('Getting shop ID from slug:', slug);

        if (!slug) return null;

        try {
            // Query shops table by slug
            const { data: shop, error } = await supabaseClient
                .from('shops')
                .select('id')
                .eq('slug', slug)
                .single();

            if (error) {
                console.error('Error fetching shop by slug:', error);

                // If slug column doesn't exist, try by name
                if (error.code === '42703' || error.message?.includes('column')) {
                    console.log('Slug column not found, trying by name...');

                    // Convert slug to name format (replace underscores with spaces, capitalize)
                    const shopName = slug.replace(/_/g, ' ')
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');

                    const { data: shopByName, error: nameError } = await supabaseClient
                        .from('shops')
                        .select('id')
                        .ilike('name', shopName)
                        .single();

                    if (!nameError && shopByName) {
                        console.log('Found shop by name:', shopByName.id);
                        return shopByName.id;
                    }
                }

                return null;
            }

            if (shop) {
                console.log('Found shop by slug:', shop.id);
                return shop.id;
            }

            return null;
        } catch (error) {
            console.error('Exception getting shop ID from slug:', error);
            return null;
        }
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
                hours: this.getStoreHours(),
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
            return (data || []).map(barber => {
                console.log(`🔍 Barber "${barber.name}" service_ids from DB:`, barber.service_ids);

                const transformedBarber = {
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
                };

                console.log(`🔍 Barber "${barber.name}" transformed services:`, transformedBarber.services);
                return transformedBarber;
            });
        } catch (error) {
            console.error('Error fetching barbers:', error);
            return [];
        }
    },

    getBarbersSync() {
        // Synchronous version - returns cached barbers or empty array
        return this.barbersCache || [];
    },

    getBarberById(barberId) {
        // Synchronous version - returns from cache or makes async call
        const barbers = this.barbersCache || [];
        return barbers.find(b => b.id === barberId) || null;
    },

    getBarberHours(barberId) {
        const barber = this.getBarberById(barberId);
        const storeHours = this.getStoreHours();

        if (!barber) return storeHours;

        // If barber uses store hours, return store hours
        if (barber.usesStoreHours) {
            return storeHours;
        }

        // Return barber's custom hours
        return barber.hours || storeHours;
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
        console.log('updateBarber called with ID:', barberId, 'type:', typeof barberId);
        if (!currentShopId) return false;

        // Check if barberId is a valid UUID or special ID
        const isValidId = barberId && (
            barberId === 'owner' ||
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(barberId)
        );

        if (!isValidId) {
            console.error('Invalid barber ID:', barberId, 'Type:', typeof barberId);
            // Try to find barber by index if it's a number
            if (!isNaN(barberId)) {
                const index = parseInt(barberId);
                if (this.barbersCache && this.barbersCache[index]) {
                    barberId = this.barbersCache[index].id;
                    console.log('Converted index', index, 'to barber ID:', barberId);
                } else {
                    console.error('Cannot find barber at index:', index, 'Cache:', this.barbersCache);
                    return false;
                }
            } else {
                return false;
            }
        }

        try {
            const updateData = {};

            // Map the updates to database columns
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.title !== undefined) updateData.title = updates.title;
            if (updates.services !== undefined) {
                // Convert services object to array of IDs
                // Filter to only include valid UUID format IDs (not legacy string IDs)
                const serviceIds = Object.keys(updates.services)
                    .filter(id => updates.services[id])
                    .filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

                // Only set service_ids if we have valid UUIDs
                if (serviceIds.length > 0) {
                    updateData.service_ids = serviceIds;
                } else {
                    // If no valid UUIDs, set empty array
                    updateData.service_ids = [];
                }
            }
            if (updates.hours !== undefined) updateData.working_hours = updates.hours;
            if (updates.isOwner !== undefined) updateData.is_owner = updates.isOwner;
            if (updates.usesStoreHours !== undefined) updateData.uses_store_hours = updates.usesStoreHours;

            console.log('Attempting to update barber with data:', updateData, 'for ID:', barberId);

            const { error } = await supabaseClient
                .from('barbers')
                .update(updateData)
                .eq('id', barberId);

            if (error) {
                console.error('Supabase update error details:', {
                    error,
                    barberId,
                    updateData,
                    currentShopId
                });
                throw error;
            }

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

        // Check if barberId is a valid UUID or special ID
        const isValidId = barberId && (
            barberId === 'owner' ||
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(barberId)
        );

        if (!isValidId) {
            console.error('Invalid barber ID for delete:', barberId);
            // Try to find barber by index if it's a number
            if (!isNaN(barberId)) {
                const index = parseInt(barberId);
                if (this.barbersCache && this.barbersCache[index]) {
                    barberId = this.barbersCache[index].id;
                    console.log('Converted index', index, 'to barber ID for delete:', barberId);
                } else {
                    console.error('Cannot find barber at index for delete:', index);
                    return false;
                }
            } else {
                return false;
            }
        }

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
    getServices() {
        // Synchronous version - return cached services
        if (this.servicesCache) {
            return this.servicesCache;
        }

        // If no cache and no shop ID, return defaults
        if (!currentShopId) {
            return this.defaultServices;
        }

        // Return empty object if cache not loaded yet
        console.warn('Services cache not loaded, returning empty object');
        return {};
    },

    async loadServices() {
        if (!currentShopId) {
            // Return default services for demo
            this.servicesCache = this.defaultServices;
            return this.defaultServices;
        }

        try {
            const { data, error } = await supabaseClient
                .from('services')
                .select('*')
                .eq('shop_id', currentShopId)
                .order('display_order');

            if (error) throw error;

            console.log('🔍 RAW SERVICES FROM DATABASE:', data);
            console.log('🔍 Number of services loaded:', data ? data.length : 0);
            if (data && data.length > 0) {
                data.forEach(service => {
                    console.log(`🔍 Service "${service.name}": name_en="${service.name_en}", name_zh="${service.name_zh}"`);
                });
            }

            // Transform to match existing format (object instead of array)
            const services = {};

            // Define color palette for automatic assignment
            const colorPalette = [
                '#2196F3', // Blue
                '#E91E63', // Pink
                '#4CAF50', // Green
                '#FF9800', // Orange
                '#9C27B0', // Purple
                '#00BCD4', // Cyan
                '#FFC107', // Amber
                '#795548', // Brown
                '#607D8B', // Blue Grey
                '#F44336'  // Red
            ];

            let colorIndex = 0;
            (data || []).forEach(service => {
                // Get default color based on service name or assign from palette
                let defaultColor = '#2196F3';

                // Check for specific service names (case insensitive)
                const nameLower = service.name.toLowerCase();
                if (nameLower.includes("men") && nameLower.includes("cut")) {
                    defaultColor = '#2196F3'; // Blue
                } else if (nameLower.includes("women") && nameLower.includes("cut")) {
                    defaultColor = '#E91E63'; // Pink
                } else if (nameLower.includes("child") || nameLower.includes("kid")) {
                    defaultColor = '#4CAF50'; // Green
                } else if (nameLower.includes("color")) {
                    defaultColor = '#FF9800'; // Orange
                } else if (nameLower.includes("highlight")) {
                    defaultColor = '#9C27B0'; // Purple
                } else {
                    // Assign from palette based on order
                    defaultColor = colorPalette[colorIndex % colorPalette.length];
                    colorIndex++;
                }

                services[service.id] = {
                    name: service.name,
                    name_en: service.name_en,
                    name_zh: service.name_zh,
                    duration: service.duration,
                    price: service.price,
                    enabled: service.enabled,
                    hasActiveTime: service.has_active_time,
                    activePeriods: service.active_periods,
                    color: service.color || defaultColor
                };
                console.log(`Loaded service "${service.name}" with color ${services[service.id].color} (${service.color ? 'from DB' : 'default assigned'})`);
            });

            // Cache services for synchronous access
            this.servicesCache = services;
            console.log('🔍 SERVICES CACHE STORED:', this.servicesCache);
            return services;
        } catch (error) {
            console.error('Error fetching services:', error);
            return {};
        }
    },

    async deleteService(serviceId) {
        if (!currentShopId) return;

        try {
            // Delete from Supabase
            const { error } = await supabaseClient
                .from('services')
                .delete()
                .eq('shop_id', currentShopId)
                .eq('id', serviceId);

            if (error) throw error;

            // Remove from cache
            if (this.servicesCache && this.servicesCache[serviceId]) {
                delete this.servicesCache[serviceId];
            }

            // Reload services to ensure consistency
            await this.loadServices();

            console.log(`Service ${serviceId} deleted successfully`);
        } catch (error) {
            console.error('Error deleting service:', error);
            throw error;
        }
    },

    async saveServices(services) {
        console.log('💾 SUPABASE saveServices called with:', services);
        if (!currentShopId) return;

        try {
            // Get existing services to check for duplicates by name
            const { data: existing } = await supabaseClient
                .from('services')
                .select('id, name')
                .eq('shop_id', currentShopId);

            const existingByName = {};
            const existingIds = [];
            (existing || []).forEach(s => {
                existingByName[s.name] = s.id;
                existingIds.push(s.id);
            });

            // Collect service names from the new list
            const newServiceNames = Object.values(services).map(s => s.name);

            // Delete services that are no longer in the list
            const servicesToDelete = existing?.filter(s => !newServiceNames.includes(s.name)) || [];
            for (const serviceToDelete of servicesToDelete) {
                await supabaseClient
                    .from('services')
                    .delete()
                    .eq('id', serviceToDelete.id);
                console.log(`Deleted service: ${serviceToDelete.name}`);
            }

            const finalServiceIds = [];

            // Define color palette for services
            const colorPalette = [
                '#2196F3', // Blue
                '#E91E63', // Pink
                '#4CAF50', // Green
                '#FF9800', // Orange
                '#9C27B0', // Purple
                '#00BCD4', // Cyan
                '#FFC107', // Amber
                '#795548', // Brown
                '#607D8B', // Blue Grey
                '#F44336'  // Red
            ];

            let colorIndex = 0;
            const serviceList = Object.entries(services);

            for (const [serviceId, service] of serviceList) {
                // If service already has a color, use it
                let assignedColor = service.color;

                // Only assign a default color if one isn't already provided
                if (!assignedColor) {
                    // Check for specific service names (case insensitive)
                    const nameLower = service.name.toLowerCase();
                    if (nameLower.includes("men") && nameLower.includes("cut")) {
                        assignedColor = '#2196F3'; // Blue
                    } else if (nameLower.includes("women") && nameLower.includes("cut")) {
                        assignedColor = '#E91E63'; // Pink
                    } else if (nameLower.includes("child") || nameLower.includes("kid")) {
                        assignedColor = '#4CAF50'; // Green
                    } else if (nameLower.includes("color")) {
                        assignedColor = '#FF9800'; // Orange
                    } else if (nameLower.includes("highlight")) {
                        assignedColor = '#9C27B0'; // Purple
                    } else {
                        // Use color from existing service if available, otherwise assign from palette
                        const existingService = existingByName[service.name];
                        if (existingService && this.servicesCache && this.servicesCache[existingService]) {
                            assignedColor = this.servicesCache[existingService].color;
                        }
                        if (!assignedColor) {
                            // Assign sequential colors from palette to make them distinct
                            const index = serviceList.findIndex(([id]) => id === serviceId);
                            assignedColor = colorPalette[index % colorPalette.length];
                        }
                    }
                }

                const serviceData = {
                    name: service.name,
                    name_en: service.name_en,
                    name_zh: service.name_zh,
                    duration: service.duration,
                    price: service.price,
                    enabled: service.enabled,
                    has_active_time: service.hasActiveTime,
                    active_periods: service.activePeriods,
                    color: assignedColor
                };

                console.log(`💾 Preparing service "${service.name}" for database:`);
                console.log(`💾   name_en: "${serviceData.name_en}", name_zh: "${serviceData.name_zh}"`);

                // Check if a service with this name already exists
                if (existingByName[service.name]) {
                    // Update existing service by name match
                    const existingId = existingByName[service.name];
                    await supabaseClient
                        .from('services')
                        .update(serviceData)
                        .eq('id', existingId);
                    finalServiceIds.push(existingId);
                } else {
                    // Insert new service
                    const { data: newService } = await supabaseClient
                        .from('services')
                        .insert({
                            shop_id: currentShopId,
                            ...serviceData
                        })
                        .select()
                        .single();
                    if (newService) {
                        finalServiceIds.push(newService.id);
                        existingByName[service.name] = newService.id;
                    }
                }
            }

            // Reload services cache after saving
            await this.loadServices();

            // Return the actual service IDs for barber updates
            return finalServiceIds;
        } catch (error) {
            console.error('Error saving services:', error);
            return [];
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

    getServiceColor(serviceId) {
        // Get color for a specific service
        const services = this.servicesCache || this.defaultServices;

        // First check if the service exists in cache
        if (services[serviceId]) {
            return services[serviceId].color || this.serviceColors[serviceId] || '#2196F3';
        }

        // Fallback to default colors for legacy IDs
        return this.serviceColors[serviceId] || '#2196F3';
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

    getAppointmentsSync() {
        // Synchronous version that returns cached appointments
        if (!this.appointmentsCache) {
            console.log('Warning: Appointments cache not loaded, returning empty array');
            return [];
        }
        return this.appointmentsCache;
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

            // Update the appointments cache
            if (this.appointmentsCache) {
                const newAppointment = {
                    id: data.id,
                    barberId: data.barber_id,
                    customerName: data.customer_name,
                    customerPhone: data.customer_phone,
                    customerEmail: data.customer_email,
                    services: data.service_ids,
                    date: data.appointment_date,
                    time: data.start_time,
                    endTime: data.end_time,
                    status: data.status,
                    notes: data.customer_notes,
                    createdAt: data.created_at
                };
                this.appointmentsCache.push(newAppointment);
            }

            return data;
        } catch (error) {
            console.error('Error adding appointment:', error);
            return null;
        }
    },

    // Async wrapper for appointment saving with proper error handling
    async saveAppointmentAsync(appointment) {
        console.log('saveAppointmentAsync called with appointment:', appointment);

        // Check if shop context is set
        if (!currentShopId) {
            console.error('Cannot save appointment: No shop ID set');
            throw new Error('Shop context not initialized');
        }

        try {
            const data = await this.addAppointment(appointment);
            if (data) {
                console.log('Appointment saved successfully:', data.id);
                // Refresh appointments cache after successful save
                await this.getAppointments();
                return data.id;
            } else {
                throw new Error('Failed to save appointment - no data returned');
            }
        } catch (error) {
            console.error('Error saving appointment:', error);
            throw error;
        }
    },

    // Synchronous wrapper for compatibility with old code
    saveAppointment(appointment) {
        console.log('saveAppointment called - using async addAppointment');
        console.log('Current shop ID:', currentShopId);

        // Check if shop context is set
        if (!currentShopId) {
            console.error('Cannot save appointment: No shop ID set');
            alert('Unable to save appointment. Please refresh the page and try again.');
            return null;
        }

        // Call the async function but return a temporary ID immediately
        this.addAppointment(appointment).then(data => {
            if (data) {
                console.log('Appointment saved successfully:', data.id);
                // Refresh appointments cache after successful save
                this.getAppointments();
            } else {
                console.error('Failed to save appointment');
                alert('Failed to save appointment. Please try again.');
            }
        }).catch(error => {
            console.error('Error saving appointment:', error);
            alert('Error saving appointment. Please check your connection and try again.');
        });

        // Return a temporary ID for immediate use
        const tempId = 'TEMP_' + Date.now();
        appointment.id = tempId;
        return tempId;
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
    // Synchronous version - returns cached store hours
    getStoreHours() {
        // Return cached hours if available and valid
        if (this.storeHoursCache && this.storeHoursCache.thursday !== undefined) {
            // Validate that all days exist
            const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const hasAllDays = requiredDays.every(day => this.storeHoursCache[day] !== undefined);

            if (hasAllDays) {
                return this.storeHoursCache;
            } else {
                console.warn('Store hours cache incomplete, merging with defaults');
                // Merge with defaults to ensure all days exist
                return { ...this.defaultStoreHours, ...this.storeHoursCache };
            }
        }

        // Return defaults if no cache
        console.warn('Store hours cache not loaded, returning defaults');
        return this.defaultStoreHours;
    },

    // Async version - loads store hours from database
    async loadStoreHours() {
        // Try to get shop ID if not set
        if (!currentShopId) {
            currentShopId = this.getCurrentShopId();
        }

        if (!currentShopId) {
            console.warn('No shop ID available for loadStoreHours');
            this.storeHoursCache = this.defaultStoreHours;
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
                    this.storeHoursCache = this.defaultStoreHours;
                    return this.defaultStoreHours;
                }
                // If it's "no rows found", that's okay
                if (error.code !== 'PGRST116') {
                    console.error('Error fetching store hours:', error);
                }
                this.storeHoursCache = this.defaultStoreHours;
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
                this.storeHoursCache = this.defaultStoreHours;
                return this.defaultStoreHours;
            }

            console.log('Store hours loaded from database:', data.store_hours);
            const hours = data.store_hours || this.defaultStoreHours;
            this.storeHoursCache = hours; // Cache the hours
            return hours;
        } catch (error) {
            console.error('Error fetching store hours:', error);
            this.storeHoursCache = this.defaultStoreHours;
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
            } else {
                // Update cache after successful save
                this.storeHoursCache = hours;
            }
        } catch (error) {
            console.error('Error saving store hours:', error);
        }
    },

    // BOOKING POLICIES
    // Synchronous version - returns cached policies
    getBookingPolicies() {
        // Always return valid policies
        if (this.bookingPoliciesCache) {
            return this.bookingPoliciesCache;
        }

        // Return defaults if no cache (without warning - this is normal during init)
        const defaultPolicies = {
            minBookingHours: 2,
            maxBookingDays: 30,
            cancellationHours: 24
        };
        return defaultPolicies;
    },

    // Async version - loads policies from database
    async loadBookingPolicies() {
        const defaultPolicies = {
            minBookingHours: 2,
            maxBookingDays: 30,
            cancellationHours: 24
        };

        if (!currentShopId) {
            this.bookingPoliciesCache = defaultPolicies;
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
                    this.bookingPoliciesCache = defaultPolicies;
                    return defaultPolicies;
                }
                // If it's "no rows found", that's okay
                if (error.code !== 'PGRST116') {
                    console.error('Error fetching booking policies:', error);
                }
                this.bookingPoliciesCache = defaultPolicies;
                return defaultPolicies;
            }

            const policies = {
                minBookingHours: data?.min_booking_hours !== undefined ? data.min_booking_hours : 2,
                maxBookingDays: data?.max_booking_days !== undefined ? data.max_booking_days : 30,
                cancellationHours: data?.cancellation_notice_hours !== undefined ? data.cancellation_notice_hours : 24
            };
            this.bookingPoliciesCache = policies;
            return policies;
        } catch (error) {
            console.error('Error fetching booking policies:', error);
            this.bookingPoliciesCache = defaultPolicies;
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
            } else {
                // Update cache after successful save
                this.bookingPoliciesCache = policies;
            }
        } catch (error) {
            console.error('Error saving booking policies:', error);
        }
    },

    // AVAILABILITY CHECKING
    getAvailableSlots(date, serviceDuration = 30, barberId = null) {
        // Ensure appointments cache is loaded
        if (!this.appointmentsCache) {
            console.log('[Bridge] Appointments cache not loaded, loading now...');
            // Try to load appointments synchronously from cache
            this.getAppointments();
        }

        // Force refresh store hours if cache is potentially stale
        if (!this.storeHoursCache || !this.storeHoursCache.thursday ||
            (this.storeHoursCache.thursday && this.storeHoursCache.thursday.closed === undefined)) {
            console.log('[Bridge] Store hours cache seems incomplete, using defaults');
            this.storeHoursCache = this.defaultStoreHours;
        }
        console.log('[Bridge] getAvailableSlots called with:', {
            date: date,
            dateString: date ? date.toString() : 'null',
            serviceDuration: serviceDuration,
            barberId: barberId,
            appointmentsLoaded: this.appointmentsCache ? this.appointmentsCache.length : 'not loaded'
        });
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        console.log('[Bridge] Day name extracted:', dayName);

        // Get hours for the specific barber or store
        let hours;
        if (barberId) {
            const barber = this.getBarberById(barberId);
            hours = barber ? barber.hours : this.getStoreHours();
        } else {
            hours = this.getStoreHours();
        }

        const dayHours = hours[dayName];
        console.log('[Bridge] Hours for', dayName + ':', dayHours);

        if (!dayHours || dayHours.closed) {
            console.log('[Bridge] Returning empty - store closed or no hours for', dayName);
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

        console.log('[Bridge] Generated slots:', slots.length, 'slots for', dayName, '- first few:', slots.slice(0, 5));
        return slots;
    },

    isSlotConflicting(date, time, duration, barberId = null) {
        // Check if this time slot conflicts with existing appointments
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

        // Get appointments for this date
        const appointments = this.getAppointmentsByDate(dateStr);

        // Convert time to minutes for easier comparison
        const slotStart = this.timeToMinutes(time);
        const slotEnd = slotStart + duration;

        // Check each appointment for conflicts
        for (const apt of appointments) {
            // If barberId is specified, only check appointments for that barber
            if (barberId && apt.barberId !== barberId) {
                continue;
            }

            // Convert appointment times to minutes
            const aptStart = this.timeToMinutes(apt.time);
            const aptEnd = this.timeToMinutes(apt.endTime);

            // Check for overlap
            // Slots conflict if they overlap at any point
            if ((slotStart < aptEnd && slotEnd > aptStart)) {
                console.log(`Slot conflict detected: ${time} conflicts with appointment at ${apt.time}-${apt.endTime}`);
                return true;
            }
        }

        // TODO: Also check blocked times when implemented

        return false;
    },

    isTimeSlotBooked(date, time, duration, barberId) {
        // Use the same conflict checking logic
        return this.isSlotConflicting(date, time, duration, barberId);
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
            name_en: "Men's Cut",
            name_zh: "男士理发",
            duration: 30,
            price: 25,
            enabled: true,
            hasActiveTime: false,
            color: '#2196F3'
        },
        'womens-cut': {
            name: "Women's Cut",
            name_en: "Women's Cut",
            name_zh: "女士理发",
            duration: 45,
            price: 35,
            enabled: true,
            hasActiveTime: false,
            color: '#E91E63'
        },
        'kids-cut': {
            name: "Children's Cut",
            name_en: "Children's Cut",
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
    storeHoursCache: null,  // Cache for store hours
    bookingPoliciesCache: null,  // Cache for booking policies

    // Color palette for services
    serviceColors: {
        'mens-cut': '#2196F3',
        'womens-cut': '#E91E63',
        'kids-cut': '#4CAF50',
        'coloring': '#FF9800',
        'highlights': '#9C27B0'
    },

    // Utility functions
    formatTime(timeStr) {
        // Format time in 24-hour format
        if (!timeStr) return '';
        const [hour, minute] = timeStr.split(':').map(Number);
        return `${hour.toString().padStart(2, '0')}:${(minute || 0).toString().padStart(2, '0')}`;
    },

    timeToMinutes(time) {
        if (!time) return 0;
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    },

    minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    },

    // Helper: Format time for display (12-hour format)
    formatTimeDisplay(time) {
        if (!time) return '';
        const [hours, minutes] = time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
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

        // Try to send real email if EmailJS is configured
        if (typeof emailjs !== 'undefined' && emailConfig.serviceId) {
            // Get the appropriate template ID based on email type
            // Note: confirmation and rescheduled use the same template (EmailJS free tier limit)
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
                time: this.formatTimeDisplay(appointment.time),
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
                templateParams.services = `RESCHEDULED - ${templateParams.services}\n(Previously: ${oldDateStr} at ${this.formatTimeDisplay(oldAppointment.time)})`;
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
                templateParams.old_time = this.formatTimeDisplay(oldAppointment.time);
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

            // Store sent emails
            const sentEmails = JSON.parse(localStorage.getItem('sentEmails') || '[]');
            sentEmails.push({
                to: appointment.customerEmail,
                subject: 'Appointment Confirmation',
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

    // Convenience methods for specific email types
    sendConfirmationEmail(appointment) {
        this.sendEmail('confirmation', appointment);
    },

    sendRescheduledEmail(newAppointment, oldAppointment) {
        this.sendEmail('rescheduled', newAppointment, oldAppointment);
    },

    sendCancellationEmail(appointment) {
        this.sendEmail('cancelled', appointment);
    }
};

// Initialize on load
SharedData.initialize();

// Initialize caches after SharedData is defined
(async function initializeCaches() {
    // Wait a bit for SharedData to be ready
    setTimeout(async () => {
        try {
            // Load booking policies into cache
            await SharedData.loadBookingPolicies();
            console.log('Booking policies cache loaded');
            // Load store hours into cache
            await SharedData.loadStoreHours();
            console.log('Store hours cache loaded');
        } catch (error) {
            console.warn('Cache initialization error:', error);
        }
    }, 100);
})();