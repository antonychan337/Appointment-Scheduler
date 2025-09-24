-- Supabase Database Schema for Appointment Scheduler
-- Multi-tenant SaaS architecture with shop-based isolation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SHOPS TABLE (Multi-tenant root)
-- =====================================================
CREATE TABLE IF NOT EXISTS shops (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    timezone VARCHAR(50) DEFAULT 'America/New_York',

    -- Subscription details
    subscription_status VARCHAR(50) DEFAULT 'trial', -- trial, active, cancelled, expired
    subscription_plan VARCHAR(50) DEFAULT 'basic', -- basic, premium, enterprise
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    trial_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- =====================================================
-- PROFILES TABLE (Extends Supabase Auth)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'owner', -- owner, admin, barber, staff
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    avatar_url TEXT,

    -- Permissions (JSONB for flexibility)
    permissions JSONB DEFAULT '{}',

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,

    -- Ensure one owner per shop
    CONSTRAINT unique_shop_owner UNIQUE (shop_id, role)
        DEFERRABLE INITIALLY DEFERRED
);

-- =====================================================
-- BARBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS barbers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

    name VARCHAR(255) NOT NULL,
    title VARCHAR(100), -- e.g., "Master Barber", "Senior Stylist"
    bio TEXT,
    avatar_url TEXT,

    -- Flags
    is_owner BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    accepts_walkins BOOLEAN DEFAULT true,

    -- Working hours (JSONB for flexibility)
    -- Format: { "monday": { "open": "09:00", "close": "18:00", "closed": false }, ... }
    working_hours JSONB DEFAULT '{
        "monday": {"open": "09:00", "close": "18:00", "closed": false},
        "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
        "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
        "thursday": {"open": "09:00", "close": "18:00", "closed": false},
        "friday": {"open": "09:00", "close": "18:00", "closed": false},
        "saturday": {"open": "10:00", "close": "17:00", "closed": false},
        "sunday": {"open": "", "close": "", "closed": true}
    }',

    -- Service associations (array of service IDs)
    service_ids UUID[] DEFAULT '{}',

    -- Display order
    display_order INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SERVICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,

    -- Service details
    name VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255), -- Chinese translation
    description TEXT,
    description_zh TEXT,

    duration INTEGER NOT NULL, -- in minutes
    price DECIMAL(10, 2) NOT NULL,

    -- Service configuration
    enabled BOOLEAN DEFAULT true,
    has_active_time BOOLEAN DEFAULT false,
    active_periods JSONB DEFAULT '[]', -- [{"start": 0, "end": 30}, ...]

    -- Visual
    color VARCHAR(7), -- Hex color code
    icon VARCHAR(50), -- Icon identifier

    -- Display order
    display_order INTEGER DEFAULT 0,

    -- Category (for grouping)
    category VARCHAR(100),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- APPOINTMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
    barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE NOT NULL,

    -- Customer information
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    customer_notes TEXT,

    -- Appointment details
    service_ids UUID[] NOT NULL, -- Array of service IDs
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- Status management
    status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, cancelled, completed, no-show
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES profiles(id),

    -- Financial
    total_price DECIMAL(10, 2),
    paid BOOLEAN DEFAULT false,
    payment_method VARCHAR(50), -- cash, card, wechat, alipay

    -- Internal notes
    internal_notes TEXT,

    -- Confirmation
    confirmation_code VARCHAR(20),
    confirmed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- =====================================================
-- BLOCKED_TIMES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS blocked_times (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
    barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,

    -- Block details
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    reason VARCHAR(255),

    -- Type of block
    block_type VARCHAR(50) DEFAULT 'break', -- break, vacation, training, other

    -- Recurrence (optional)
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB, -- For future recurring blocks

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- =====================================================
-- SHOP_SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS shop_settings (
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE PRIMARY KEY,

    -- Store hours (JSONB)
    store_hours JSONB DEFAULT '{
        "monday": {"open": "09:00", "close": "18:00", "closed": false},
        "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
        "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
        "thursday": {"open": "09:00", "close": "18:00", "closed": false},
        "friday": {"open": "09:00", "close": "20:00", "closed": false},
        "saturday": {"open": "10:00", "close": "17:00", "closed": false},
        "sunday": {"open": "", "close": "", "closed": true}
    }',

    -- Booking policies
    min_booking_hours INTEGER DEFAULT 2, -- Minimum hours before appointment
    max_booking_days INTEGER DEFAULT 30, -- Maximum days in advance
    cancellation_notice_hours INTEGER DEFAULT 24,
    allow_same_day_booking BOOLEAN DEFAULT false,

    -- Email configuration (encrypted)
    emailjs_service_id TEXT,
    emailjs_template_id TEXT,
    emailjs_cancel_template_id TEXT,
    emailjs_public_key TEXT,
    emailjs_private_key TEXT, -- Should be encrypted
    email_notifications_enabled BOOLEAN DEFAULT true,

    -- Language and localization
    default_language VARCHAR(10) DEFAULT 'en', -- en, zh
    supported_languages TEXT[] DEFAULT ARRAY['en', 'zh'],
    currency VARCHAR(3) DEFAULT 'USD',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
    time_format VARCHAR(10) DEFAULT '12h', -- 12h or 24h

    -- Branding
    primary_color VARCHAR(7) DEFAULT '#2196F3',
    logo_url TEXT,
    business_description TEXT,
    business_description_zh TEXT,

    -- Social media
    website_url TEXT,
    facebook_url TEXT,
    instagram_url TEXT,
    wechat_id VARCHAR(100),

    -- Metadata
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CUSTOMERS TABLE (Optional - for customer accounts)
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,

    -- Customer details
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),

    -- Preferences
    preferred_barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL,
    preferred_language VARCHAR(10) DEFAULT 'en',
    notes TEXT,

    -- Stats
    total_appointments INTEGER DEFAULT 0,
    no_show_count INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique phone per shop
    CONSTRAINT unique_shop_customer_phone UNIQUE (shop_id, phone)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_appointments_shop_date ON appointments(shop_id, appointment_date);
CREATE INDEX idx_appointments_barber_date ON appointments(barber_id, appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_blocked_times_shop ON blocked_times(shop_id, start_datetime, end_datetime);
CREATE INDEX idx_barbers_shop ON barbers(shop_id) WHERE is_active = true;
CREATE INDEX idx_services_shop ON services(shop_id) WHERE enabled = true;
CREATE INDEX idx_profiles_shop ON profiles(shop_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Shops policies
CREATE POLICY "Users can view their own shop" ON shops
    FOR SELECT USING (
        id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Owners can update their shop" ON shops
    FOR UPDATE USING (
        id IN (
            SELECT shop_id FROM profiles
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- Profiles policies
CREATE POLICY "Users can view profiles in their shop" ON profiles
    FOR SELECT USING (
        shop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Barbers policies
CREATE POLICY "Anyone can view active barbers" ON barbers
    FOR SELECT USING (is_active = true);

CREATE POLICY "Shop members can manage barbers" ON barbers
    FOR ALL USING (
        shop_id IN (
            SELECT shop_id FROM profiles
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Services policies
CREATE POLICY "Anyone can view enabled services" ON services
    FOR SELECT USING (enabled = true);

CREATE POLICY "Shop members can manage services" ON services
    FOR ALL USING (
        shop_id IN (
            SELECT shop_id FROM profiles
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Appointments policies
CREATE POLICY "Shop members can view their shop appointments" ON appointments
    FOR SELECT USING (
        shop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Anyone can create appointments" ON appointments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Shop members can update appointments" ON appointments
    FOR UPDATE USING (
        shop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Shop settings policies
CREATE POLICY "Shop members can view settings" ON shop_settings
    FOR SELECT USING (
        shop_id IN (
            SELECT shop_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Owners can update settings" ON shop_settings
    FOR UPDATE USING (
        shop_id IN (
            SELECT shop_id FROM profiles
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barbers_updated_at BEFORE UPDATE ON barbers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shop_settings_updated_at BEFORE UPDATE ON shop_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name'
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to check appointment conflicts
CREATE OR REPLACE FUNCTION check_appointment_conflict(
    p_barber_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    conflict_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM appointments
        WHERE barber_id = p_barber_id
        AND appointment_date = p_date
        AND status = 'confirmed'
        AND (p_appointment_id IS NULL OR id != p_appointment_id)
        AND (
            (start_time <= p_start_time AND end_time > p_start_time)
            OR (start_time < p_end_time AND end_time >= p_end_time)
            OR (start_time >= p_start_time AND end_time <= p_end_time)
        )
    ) INTO conflict_exists;

    RETURN conflict_exists;
END;
$$ language 'plpgsql';