# Supabase Setup Guide

## Prerequisites

1. Create a Supabase account at https://supabase.com
2. Create a new Supabase project

## Step 1: Database Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase/schema.sql`
4. Click "Run" to create all tables, indexes, and RLS policies

## Step 2: Authentication Setup

1. Go to Authentication > Settings
2. Enable Email/Password authentication
3. Configure email templates for:
   - Confirmation emails
   - Password reset emails
   - Magic link emails

4. Set redirect URLs:
   ```
   Site URL: http://localhost:3000
   Redirect URLs:
   - http://localhost:3000/auth/callback
   - http://localhost:3000/reset-password
   - https://yourdomain.com/auth/callback (for production)
   ```

## Step 3: Environment Configuration

1. Copy `.env.template` to `.env`:
   ```bash
   cp .env.template .env
   ```

2. Get your Supabase credentials:
   - Go to Settings > API in your Supabase dashboard
   - Copy the following values to your `.env` file:
     - `SUPABASE_URL`: Your project URL
     - `SUPABASE_ANON_KEY`: Your anon/public key
     - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (keep this secret!)

## Step 4: Backend Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Run database migrations (if any):
   ```bash
   npm run migrate
   ```

3. Start the backend server:
   ```bash
   npm run dev
   ```

## Step 5: Frontend Integration

To integrate Supabase with the existing frontend:

### Option A: Direct Browser Integration (Quick Start)

1. Add Supabase client to HTML files:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const SUPABASE_URL = 'your-project-url';
  const SUPABASE_ANON_KEY = 'your-anon-key';
  const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
</script>
```

2. Create a new file `supabase-client.js`:
```javascript
// Initialize Supabase client
const supabaseUrl = 'your-project-url';
const supabaseAnonKey = 'your-anon-key';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

// Wrapper functions to replace SharedData
const SupabaseData = {
  // Authentication
  async signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  async signUp(email, password, metadata) {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabaseClient.auth.signOut();
    return { error };
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
  },

  // Shop operations
  async getShop(shopId) {
    const { data, error } = await supabaseClient
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();
    return { data, error };
  },

  // Barbers
  async getBarbers(shopId) {
    const { data, error } = await supabaseClient
      .from('barbers')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('display_order');
    return { data: data || [], error };
  },

  // Services
  async getServices(shopId) {
    const { data, error } = await supabaseClient
      .from('services')
      .select('*')
      .eq('shop_id', shopId)
      .eq('enabled', true)
      .order('display_order');
    return { data: data || [], error };
  },

  // Appointments
  async getAppointments(shopId, date) {
    const { data, error } = await supabaseClient
      .from('appointments')
      .select('*')
      .eq('shop_id', shopId)
      .eq('appointment_date', date)
      .eq('status', 'confirmed');
    return { data: data || [], error };
  },

  async createAppointment(appointment) {
    const { data, error } = await supabaseClient
      .from('appointments')
      .insert(appointment)
      .select()
      .single();
    return { data, error };
  },

  async cancelAppointment(appointmentId, reason) {
    const { data, error } = await supabaseClient
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date()
      })
      .eq('id', appointmentId)
      .select()
      .single();
    return { data, error };
  },

  // Shop settings
  async getShopSettings(shopId) {
    const { data, error } = await supabaseClient
      .from('shop_settings')
      .select('*')
      .eq('shop_id', shopId)
      .single();
    return { data, error };
  },

  async updateShopSettings(shopId, settings) {
    const { data, error } = await supabaseClient
      .from('shop_settings')
      .upsert({
        shop_id: shopId,
        ...settings
      })
      .select()
      .single();
    return { data, error };
  }
};
```

### Option B: Full Backend Integration (Recommended for Production)

Use the backend API endpoints created in `backend/src/` to handle all Supabase operations.

## Step 6: Data Migration from localStorage

To migrate existing data from localStorage to Supabase:

1. Create a migration script `migrate-data.html`:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Migrate Data to Supabase</title>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="shared-data.js"></script>
</head>
<body>
    <h1>Data Migration Tool</h1>
    <button onclick="migrateData()">Start Migration</button>
    <div id="status"></div>

    <script>
        const SUPABASE_URL = 'your-project-url';
        const SUPABASE_ANON_KEY = 'your-anon-key';
        const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        async function migrateData() {
            const status = document.getElementById('status');

            try {
                // 1. Get existing data from localStorage
                status.innerHTML = 'Reading localStorage data...';

                const services = SharedData.getServices();
                const barbers = SharedData.getBarbers();
                const appointments = SharedData.getAppointments();
                const storeHours = SharedData.getStoreHours();
                const ownerProfile = JSON.parse(localStorage.getItem('ownerProfile') || '{}');

                // 2. Create shop owner account
                status.innerHTML += '<br>Creating owner account...';
                // Add migration logic here

                // 3. Migrate services
                status.innerHTML += '<br>Migrating services...';
                // Add migration logic here

                // 4. Migrate barbers
                status.innerHTML += '<br>Migrating barbers...';
                // Add migration logic here

                // 5. Migrate appointments
                status.innerHTML += '<br>Migrating appointments...';
                // Add migration logic here

                status.innerHTML += '<br><strong>Migration complete!</strong>';
            } catch (error) {
                status.innerHTML += '<br><span style="color: red;">Error: ' + error.message + '</span>';
            }
        }
    </script>
</body>
</html>
```

## Step 7: Testing

1. Test authentication flow:
   - Sign up as a new shop owner
   - Sign in
   - Password reset

2. Test data operations:
   - Create/edit barbers
   - Create/edit services
   - Book appointments
   - Cancel appointments

3. Test real-time features:
   - Open two browser windows
   - Book appointment in one
   - See it appear in the other

## Step 8: Production Deployment

1. Update environment variables for production
2. Set up proper domain and SSL certificates
3. Configure Supabase RLS policies for production security
4. Set up monitoring and backups
5. Configure rate limiting and abuse prevention

## Security Considerations

1. **Never expose service role key in frontend code**
2. Always use RLS policies to secure data
3. Validate all user inputs
4. Use prepared statements (Supabase handles this)
5. Implement rate limiting for API calls
6. Set up proper CORS policies
7. Use HTTPS in production

## Troubleshooting

### Common Issues:

1. **Authentication not working**
   - Check email settings in Supabase dashboard
   - Verify redirect URLs are correct
   - Check browser console for errors

2. **RLS policies blocking access**
   - Review policies in `schema.sql`
   - Check user roles and permissions
   - Use Supabase dashboard to test policies

3. **Data not syncing**
   - Check network tab for failed requests
   - Verify Supabase URL and keys
   - Check RLS policies

## Support

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: Report any bugs in your repository