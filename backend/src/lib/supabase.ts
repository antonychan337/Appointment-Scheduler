import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
    throw new Error('SUPABASE_URL is required in environment variables');
}

if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY is required in environment variables');
}

// Create Supabase client for server-side operations
export const supabase: SupabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    }
);

// Create Supabase client for client-side operations (with anon key)
export const supabaseClient: SupabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Database types (generated from Supabase)
export interface Shop {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    timezone: string;
    subscription_status: 'trial' | 'active' | 'cancelled' | 'expired';
    subscription_plan: 'basic' | 'premium' | 'enterprise';
    subscription_expires_at?: Date;
    trial_expires_at?: Date;
    created_at: Date;
    updated_at: Date;
    is_active: boolean;
}

export interface Profile {
    id: string;
    shop_id?: string;
    role: 'owner' | 'admin' | 'barber' | 'staff';
    first_name?: string;
    last_name?: string;
    phone?: string;
    avatar_url?: string;
    permissions: Record<string, any>;
    created_at: Date;
    updated_at: Date;
    is_active: boolean;
}

export interface Barber {
    id: string;
    shop_id: string;
    profile_id?: string;
    name: string;
    title?: string;
    bio?: string;
    avatar_url?: string;
    is_owner: boolean;
    is_active: boolean;
    accepts_walkins: boolean;
    working_hours: WorkingHours;
    service_ids: string[];
    display_order: number;
    created_at: Date;
    updated_at: Date;
}

export interface WorkingHours {
    [day: string]: {
        open: string;
        close: string;
        closed: boolean;
    };
}

export interface Service {
    id: string;
    shop_id: string;
    name: string;
    name_zh?: string;
    description?: string;
    description_zh?: string;
    duration: number;
    price: number;
    enabled: boolean;
    has_active_time: boolean;
    active_periods: ActivePeriod[];
    color?: string;
    icon?: string;
    display_order: number;
    category?: string;
    created_at: Date;
    updated_at: Date;
}

export interface ActivePeriod {
    start: number;
    end: number;
}

export interface Appointment {
    id: string;
    shop_id: string;
    barber_id: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    customer_notes?: string;
    service_ids: string[];
    appointment_date: Date;
    start_time: string;
    end_time: string;
    status: 'confirmed' | 'cancelled' | 'completed' | 'no-show';
    cancellation_reason?: string;
    cancelled_at?: Date;
    cancelled_by?: string;
    total_price?: number;
    paid: boolean;
    payment_method?: 'cash' | 'card' | 'wechat' | 'alipay';
    internal_notes?: string;
    confirmation_code?: string;
    confirmed_at?: Date;
    created_at: Date;
    updated_at: Date;
    created_by?: string;
}

export interface BlockedTime {
    id: string;
    shop_id: string;
    barber_id?: string;
    start_datetime: Date;
    end_datetime: Date;
    reason?: string;
    block_type: 'break' | 'vacation' | 'training' | 'other';
    is_recurring: boolean;
    recurrence_pattern?: Record<string, any>;
    created_at: Date;
    created_by?: string;
}

export interface ShopSettings {
    shop_id: string;
    store_hours: WorkingHours;
    min_booking_hours: number;
    max_booking_days: number;
    cancellation_notice_hours: number;
    allow_same_day_booking: boolean;
    emailjs_service_id?: string;
    emailjs_template_id?: string;
    emailjs_cancel_template_id?: string;
    emailjs_public_key?: string;
    emailjs_private_key?: string;
    email_notifications_enabled: boolean;
    default_language: 'en' | 'zh';
    supported_languages: string[];
    currency: string;
    date_format: string;
    time_format: '12h' | '24h';
    primary_color?: string;
    logo_url?: string;
    business_description?: string;
    business_description_zh?: string;
    website_url?: string;
    facebook_url?: string;
    instagram_url?: string;
    wechat_id?: string;
    updated_at: Date;
}

export interface Customer {
    id: string;
    shop_id: string;
    name: string;
    phone: string;
    email?: string;
    preferred_barber_id?: string;
    preferred_language: 'en' | 'zh';
    notes?: string;
    total_appointments: number;
    no_show_count: number;
    created_at: Date;
    updated_at: Date;
}