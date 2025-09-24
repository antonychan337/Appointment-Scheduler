import { supabase } from '../lib/supabase';
import type {
    Shop,
    Barber,
    Service,
    Appointment,
    BlockedTime,
    ShopSettings,
    Customer
} from '../lib/supabase';

export class DataService {
    // =====================================================
    // SHOP OPERATIONS
    // =====================================================
    static async getShop(shopId: string): Promise<Shop | null> {
        const { data, error } = await supabase
            .from('shops')
            .select('*')
            .eq('id', shopId)
            .single();

        if (error) {
            console.error('Error fetching shop:', error);
            return null;
        }

        return data;
    }

    static async updateShop(shopId: string, updates: Partial<Shop>): Promise<Shop | null> {
        const { data, error } = await supabase
            .from('shops')
            .update(updates)
            .eq('id', shopId)
            .select()
            .single();

        if (error) {
            console.error('Error updating shop:', error);
            return null;
        }

        return data;
    }

    // =====================================================
    // BARBER OPERATIONS
    // =====================================================
    static async getBarbers(shopId: string, activeOnly = true): Promise<Barber[]> {
        let query = supabase
            .from('barbers')
            .select('*')
            .eq('shop_id', shopId)
            .order('display_order', { ascending: true });

        if (activeOnly) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching barbers:', error);
            return [];
        }

        return data || [];
    }

    static async getBarber(barberId: string): Promise<Barber | null> {
        const { data, error } = await supabase
            .from('barbers')
            .select('*')
            .eq('id', barberId)
            .single();

        if (error) {
            console.error('Error fetching barber:', error);
            return null;
        }

        return data;
    }

    static async createBarber(barber: Omit<Barber, 'id' | 'created_at' | 'updated_at'>): Promise<Barber | null> {
        const { data, error } = await supabase
            .from('barbers')
            .insert(barber)
            .select()
            .single();

        if (error) {
            console.error('Error creating barber:', error);
            return null;
        }

        return data;
    }

    static async updateBarber(barberId: string, updates: Partial<Barber>): Promise<Barber | null> {
        const { data, error } = await supabase
            .from('barbers')
            .update(updates)
            .eq('id', barberId)
            .select()
            .single();

        if (error) {
            console.error('Error updating barber:', error);
            return null;
        }

        return data;
    }

    static async deleteBarber(barberId: string): Promise<boolean> {
        const { error } = await supabase
            .from('barbers')
            .delete()
            .eq('id', barberId);

        if (error) {
            console.error('Error deleting barber:', error);
            return false;
        }

        return true;
    }

    // =====================================================
    // SERVICE OPERATIONS
    // =====================================================
    static async getServices(shopId: string, enabledOnly = true): Promise<Service[]> {
        let query = supabase
            .from('services')
            .select('*')
            .eq('shop_id', shopId)
            .order('display_order', { ascending: true });

        if (enabledOnly) {
            query = query.eq('enabled', true);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching services:', error);
            return [];
        }

        return data || [];
    }

    static async getService(serviceId: string): Promise<Service | null> {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('id', serviceId)
            .single();

        if (error) {
            console.error('Error fetching service:', error);
            return null;
        }

        return data;
    }

    static async createService(service: Omit<Service, 'id' | 'created_at' | 'updated_at'>): Promise<Service | null> {
        const { data, error } = await supabase
            .from('services')
            .insert(service)
            .select()
            .single();

        if (error) {
            console.error('Error creating service:', error);
            return null;
        }

        return data;
    }

    static async updateService(serviceId: string, updates: Partial<Service>): Promise<Service | null> {
        const { data, error } = await supabase
            .from('services')
            .update(updates)
            .eq('id', serviceId)
            .select()
            .single();

        if (error) {
            console.error('Error updating service:', error);
            return null;
        }

        return data;
    }

    static async deleteService(serviceId: string): Promise<boolean> {
        const { error } = await supabase
            .from('services')
            .delete()
            .eq('id', serviceId);

        if (error) {
            console.error('Error deleting service:', error);
            return false;
        }

        return true;
    }

    // =====================================================
    // APPOINTMENT OPERATIONS
    // =====================================================
    static async getAppointments(
        shopId: string,
        filters?: {
            barberId?: string;
            date?: Date;
            startDate?: Date;
            endDate?: Date;
            status?: string;
        }
    ): Promise<Appointment[]> {
        let query = supabase
            .from('appointments')
            .select('*')
            .eq('shop_id', shopId)
            .order('appointment_date', { ascending: true })
            .order('start_time', { ascending: true });

        if (filters?.barberId) {
            query = query.eq('barber_id', filters.barberId);
        }

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        if (filters?.date) {
            query = query.eq('appointment_date', filters.date.toISOString().split('T')[0]);
        }

        if (filters?.startDate) {
            query = query.gte('appointment_date', filters.startDate.toISOString().split('T')[0]);
        }

        if (filters?.endDate) {
            query = query.lte('appointment_date', filters.endDate.toISOString().split('T')[0]);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching appointments:', error);
            return [];
        }

        return data || [];
    }

    static async getAppointment(appointmentId: string): Promise<Appointment | null> {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', appointmentId)
            .single();

        if (error) {
            console.error('Error fetching appointment:', error);
            return null;
        }

        return data;
    }

    static async createAppointment(
        appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>
    ): Promise<Appointment | null> {
        // Check for conflicts before creating
        const hasConflict = await this.checkAppointmentConflict(
            appointment.barber_id,
            appointment.appointment_date,
            appointment.start_time,
            appointment.end_time
        );

        if (hasConflict) {
            throw new Error('Time slot is already booked');
        }

        const { data, error } = await supabase
            .from('appointments')
            .insert(appointment)
            .select()
            .single();

        if (error) {
            console.error('Error creating appointment:', error);
            return null;
        }

        return data;
    }

    static async updateAppointment(
        appointmentId: string,
        updates: Partial<Appointment>
    ): Promise<Appointment | null> {
        // If updating time, check for conflicts
        if (updates.appointment_date || updates.start_time || updates.end_time || updates.barber_id) {
            const existing = await this.getAppointment(appointmentId);
            if (existing) {
                const hasConflict = await this.checkAppointmentConflict(
                    updates.barber_id || existing.barber_id,
                    updates.appointment_date || existing.appointment_date,
                    updates.start_time || existing.start_time,
                    updates.end_time || existing.end_time,
                    appointmentId
                );

                if (hasConflict) {
                    throw new Error('Time slot conflicts with another appointment');
                }
            }
        }

        const { data, error } = await supabase
            .from('appointments')
            .update(updates)
            .eq('id', appointmentId)
            .select()
            .single();

        if (error) {
            console.error('Error updating appointment:', error);
            return null;
        }

        return data;
    }

    static async cancelAppointment(
        appointmentId: string,
        reason?: string,
        cancelledBy?: string
    ): Promise<Appointment | null> {
        return this.updateAppointment(appointmentId, {
            status: 'cancelled',
            cancellation_reason: reason,
            cancelled_at: new Date(),
            cancelled_by: cancelledBy
        });
    }

    private static async checkAppointmentConflict(
        barberId: string,
        date: Date,
        startTime: string,
        endTime: string,
        excludeAppointmentId?: string
    ): Promise<boolean> {
        const { data, error } = await supabase
            .rpc('check_appointment_conflict', {
                p_barber_id: barberId,
                p_date: date,
                p_start_time: startTime,
                p_end_time: endTime,
                p_appointment_id: excludeAppointmentId || null
            });

        if (error) {
            console.error('Error checking appointment conflict:', error);
            return false;
        }

        return data || false;
    }

    // =====================================================
    // BLOCKED TIME OPERATIONS
    // =====================================================
    static async getBlockedTimes(
        shopId: string,
        filters?: {
            barberId?: string;
            startDate?: Date;
            endDate?: Date;
        }
    ): Promise<BlockedTime[]> {
        let query = supabase
            .from('blocked_times')
            .select('*')
            .eq('shop_id', shopId)
            .order('start_datetime', { ascending: true });

        if (filters?.barberId) {
            query = query.eq('barber_id', filters.barberId);
        }

        if (filters?.startDate) {
            query = query.gte('start_datetime', filters.startDate.toISOString());
        }

        if (filters?.endDate) {
            query = query.lte('end_datetime', filters.endDate.toISOString());
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching blocked times:', error);
            return [];
        }

        return data || [];
    }

    static async createBlockedTime(
        blockedTime: Omit<BlockedTime, 'id' | 'created_at'>
    ): Promise<BlockedTime | null> {
        const { data, error } = await supabase
            .from('blocked_times')
            .insert(blockedTime)
            .select()
            .single();

        if (error) {
            console.error('Error creating blocked time:', error);
            return null;
        }

        return data;
    }

    static async deleteBlockedTime(blockedTimeId: string): Promise<boolean> {
        const { error } = await supabase
            .from('blocked_times')
            .delete()
            .eq('id', blockedTimeId);

        if (error) {
            console.error('Error deleting blocked time:', error);
            return false;
        }

        return true;
    }

    // =====================================================
    // SHOP SETTINGS OPERATIONS
    // =====================================================
    static async getShopSettings(shopId: string): Promise<ShopSettings | null> {
        const { data, error } = await supabase
            .from('shop_settings')
            .select('*')
            .eq('shop_id', shopId)
            .single();

        if (error) {
            console.error('Error fetching shop settings:', error);
            return null;
        }

        return data;
    }

    static async updateShopSettings(
        shopId: string,
        updates: Partial<ShopSettings>
    ): Promise<ShopSettings | null> {
        const { data, error } = await supabase
            .from('shop_settings')
            .upsert({
                shop_id: shopId,
                ...updates
            })
            .select()
            .single();

        if (error) {
            console.error('Error updating shop settings:', error);
            return null;
        }

        return data;
    }

    // =====================================================
    // CUSTOMER OPERATIONS
    // =====================================================
    static async getCustomer(
        shopId: string,
        phone: string
    ): Promise<Customer | null> {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('shop_id', shopId)
            .eq('phone', phone)
            .single();

        if (error && error.code !== 'PGRST116') { // Not found error
            console.error('Error fetching customer:', error);
        }

        return data || null;
    }

    static async createOrUpdateCustomer(
        customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>
    ): Promise<Customer | null> {
        const { data, error } = await supabase
            .from('customers')
            .upsert({
                ...customer,
                updated_at: new Date()
            }, {
                onConflict: 'shop_id,phone'
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating/updating customer:', error);
            return null;
        }

        return data;
    }

    // =====================================================
    // AVAILABILITY CHECKING
    // =====================================================
    static async getAvailableTimeSlots(
        shopId: string,
        barberId: string,
        date: Date,
        serviceDuration: number
    ): Promise<string[]> {
        // Get barber's working hours
        const barber = await this.getBarber(barberId);
        if (!barber || !barber.is_active) {
            return [];
        }

        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
        const workingHours = barber.working_hours[dayOfWeek];

        if (!workingHours || workingHours.closed) {
            return [];
        }

        // Get existing appointments for the day
        const appointments = await this.getAppointments(shopId, {
            barberId,
            date,
            status: 'confirmed'
        });

        // Get blocked times for the day
        const blockedTimes = await this.getBlockedTimes(shopId, {
            barberId,
            startDate: date,
            endDate: date
        });

        // Generate time slots
        const slots: string[] = [];
        const openTime = this.timeToMinutes(workingHours.open);
        const closeTime = this.timeToMinutes(workingHours.close);

        for (let minutes = openTime; minutes <= closeTime - serviceDuration; minutes += 15) {
            const slotTime = this.minutesToTime(minutes);
            const slotEndTime = this.minutesToTime(minutes + serviceDuration);

            // Check if slot conflicts with existing appointments or blocked times
            let isAvailable = true;

            for (const appointment of appointments) {
                if (this.timeSlotsOverlap(
                    slotTime,
                    slotEndTime,
                    appointment.start_time,
                    appointment.end_time
                )) {
                    isAvailable = false;
                    break;
                }
            }

            if (isAvailable) {
                for (const blocked of blockedTimes) {
                    const blockedStartTime = new Date(blocked.start_datetime).toTimeString().slice(0, 5);
                    const blockedEndTime = new Date(blocked.end_datetime).toTimeString().slice(0, 5);

                    if (this.timeSlotsOverlap(
                        slotTime,
                        slotEndTime,
                        blockedStartTime,
                        blockedEndTime
                    )) {
                        isAvailable = false;
                        break;
                    }
                }
            }

            if (isAvailable) {
                slots.push(slotTime);
            }
        }

        return slots;
    }

    // Helper methods
    private static timeToMinutes(time: string): number {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    private static minutesToTime(minutes: number): string {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    private static timeSlotsOverlap(
        start1: string,
        end1: string,
        start2: string,
        end2: string
    ): boolean {
        const s1 = this.timeToMinutes(start1);
        const e1 = this.timeToMinutes(end1);
        const s2 = this.timeToMinutes(start2);
        const e2 = this.timeToMinutes(end2);

        return (s1 < e2 && e1 > s2);
    }
}