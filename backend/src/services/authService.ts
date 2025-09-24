import { supabase, supabaseClient } from '../lib/supabase';
import type { Shop, Profile } from '../lib/supabase';

export class AuthService {
    /**
     * Register a new shop owner
     */
    static async registerShopOwner(data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        shopName: string;
        phone?: string;
        timezone?: string;
    }) {
        try {
            // Start a Supabase transaction
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        first_name: data.firstName,
                        last_name: data.lastName
                    }
                }
            });

            if (authError) {
                throw authError;
            }

            if (!authData.user) {
                throw new Error('User creation failed');
            }

            // Create the shop
            const { data: shop, error: shopError } = await supabase
                .from('shops')
                .insert({
                    name: data.shopName,
                    email: data.email,
                    phone: data.phone,
                    timezone: data.timezone || 'America/New_York'
                })
                .select()
                .single();

            if (shopError) {
                // Rollback: delete the auth user if shop creation fails
                await supabase.auth.admin.deleteUser(authData.user.id);
                throw shopError;
            }

            // Update the user's profile with shop association
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    shop_id: shop.id,
                    role: 'owner',
                    first_name: data.firstName,
                    last_name: data.lastName,
                    phone: data.phone
                })
                .eq('id', authData.user.id);

            if (profileError) {
                // Rollback: delete shop and user
                await supabase.from('shops').delete().eq('id', shop.id);
                await supabase.auth.admin.deleteUser(authData.user.id);
                throw profileError;
            }

            // Create default shop settings
            const { error: settingsError } = await supabase
                .from('shop_settings')
                .insert({
                    shop_id: shop.id
                });

            if (settingsError) {
                console.error('Failed to create shop settings:', settingsError);
                // Non-critical error, continue
            }

            // Create owner as default barber
            const { error: barberError } = await supabase
                .from('barbers')
                .insert({
                    shop_id: shop.id,
                    profile_id: authData.user.id,
                    name: `${data.firstName} ${data.lastName}`.trim(),
                    is_owner: true,
                    is_active: true
                });

            if (barberError) {
                console.error('Failed to create owner as barber:', barberError);
                // Non-critical error, continue
            }

            // Create default services for the shop
            await this.createDefaultServices(shop.id);

            return {
                user: authData.user,
                shop,
                session: authData.session
            };
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    /**
     * Sign in a user
     */
    static async signIn(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw error;
        }

        // Get user's profile and shop information
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select(`
                *,
                shop:shops(*)
            `)
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error('Profile fetch error:', profileError);
        }

        return {
            user: data.user,
            session: data.session,
            profile
        };
    }

    /**
     * Sign out a user
     */
    static async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw error;
        }
    }

    /**
     * Get current user session
     */
    static async getSession() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            throw error;
        }
        return session;
    }

    /**
     * Reset password request
     */
    static async resetPassword(email: string) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.APP_URL}/reset-password`
        });
        if (error) {
            throw error;
        }
    }

    /**
     * Update password
     */
    static async updatePassword(newPassword: string) {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        if (error) {
            throw error;
        }
    }

    /**
     * Invite a team member (barber/staff)
     */
    static async inviteTeamMember(data: {
        email: string;
        role: 'barber' | 'staff' | 'admin';
        shopId: string;
        name: string;
    }) {
        // Generate a random password for initial setup
        const tempPassword = this.generateTempPassword();

        // Create the user account
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: tempPassword,
            options: {
                data: {
                    role: data.role,
                    shop_id: data.shopId
                }
            }
        });

        if (authError) {
            throw authError;
        }

        if (!authData.user) {
            throw new Error('User creation failed');
        }

        // Update profile with shop and role
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                shop_id: data.shopId,
                role: data.role,
                first_name: data.name.split(' ')[0],
                last_name: data.name.split(' ').slice(1).join(' ')
            })
            .eq('id', authData.user.id);

        if (profileError) {
            // Rollback
            await supabase.auth.admin.deleteUser(authData.user.id);
            throw profileError;
        }

        // If role is barber, create barber record
        if (data.role === 'barber') {
            const { error: barberError } = await supabase
                .from('barbers')
                .insert({
                    shop_id: data.shopId,
                    profile_id: authData.user.id,
                    name: data.name,
                    is_owner: false,
                    is_active: true
                });

            if (barberError) {
                console.error('Failed to create barber record:', barberError);
            }
        }

        // Send password reset email for them to set their own password
        await this.resetPassword(data.email);

        return {
            user: authData.user,
            tempPassword // Return this to show/email to the shop owner
        };
    }

    /**
     * Create default services for a new shop
     */
    private static async createDefaultServices(shopId: string) {
        const defaultServices = [
            {
                shop_id: shopId,
                name: "Men's Cut",
                name_zh: "男士理发",
                duration: 30,
                price: 25,
                color: '#2196F3',
                category: 'Haircuts',
                display_order: 1
            },
            {
                shop_id: shopId,
                name: "Women's Cut",
                name_zh: "女士理发",
                duration: 45,
                price: 35,
                color: '#E91E63',
                category: 'Haircuts',
                display_order: 2
            },
            {
                shop_id: shopId,
                name: "Children's Cut",
                name_zh: "儿童理发",
                duration: 15,
                price: 15,
                color: '#4CAF50',
                category: 'Haircuts',
                display_order: 3
            },
            {
                shop_id: shopId,
                name: "Hair Coloring",
                name_zh: "染发",
                duration: 90,
                price: 80,
                color: '#FF9800',
                category: 'Color',
                has_active_time: true,
                active_periods: [
                    { start: 0, end: 30 },
                    { start: 60, end: 90 }
                ],
                display_order: 4
            },
            {
                shop_id: shopId,
                name: "Highlights",
                name_zh: "挑染",
                duration: 120,
                price: 120,
                color: '#9C27B0',
                category: 'Color',
                has_active_time: true,
                active_periods: [
                    { start: 0, end: 15 },
                    { start: 45, end: 60 },
                    { start: 90, end: 120 }
                ],
                display_order: 5
            }
        ];

        const { error } = await supabase
            .from('services')
            .insert(defaultServices);

        if (error) {
            console.error('Failed to create default services:', error);
        }
    }

    /**
     * Generate a temporary password
     */
    private static generateTempPassword(): string {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    }

    /**
     * Verify user has permission for an action
     */
    static async checkPermission(
        userId: string,
        shopId: string,
        requiredRole?: string[]
    ): Promise<boolean> {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role, shop_id')
            .eq('id', userId)
            .eq('shop_id', shopId)
            .single();

        if (error || !profile) {
            return false;
        }

        if (requiredRole && !requiredRole.includes(profile.role)) {
            return false;
        }

        return true;
    }
}