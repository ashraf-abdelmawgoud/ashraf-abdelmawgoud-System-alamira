-- ==============================================================================
-- AL AMIRA INVENTORY & INVOICING SYSTEM (نظام الأميرة للتوريدات العامة والتجارة)
-- Seed Data & Provisioning Script — Clean Production Database (No Demo Data)
-- File: supabase/seed.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HELPER PROCEDURE FOR MANUAL USER PROVISIONING
-- Public sign-up is disabled. Accounts are created manually in Supabase Auth,
-- then added to the authorized_users allowlist using this secure procedure.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_authorized_user(
    p_user_id UUID,
    p_full_name TEXT,
    p_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.authorized_users (user_id, full_name, email, is_active)
    VALUES (p_user_id, p_full_name, p_email, true)
    ON CONFLICT (user_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        is_active = true,
        updated_at = now();
END;
$$;

-- Revoke public access to provisioning helper
REVOKE EXECUTE ON FUNCTION public.provision_authorized_user(UUID, TEXT, TEXT) FROM PUBLIC, anon;

-- Example Provisioning Call (Run this in Supabase SQL Editor after creating the two accounts in Auth):
-- SELECT public.provision_authorized_user('REPLACE_WITH_AUTH_USER_1_UUID', 'اسم المستخدم الأول', 'user1@alamira.com');
-- SELECT public.provision_authorized_user('REPLACE_WITH_AUTH_USER_2_UUID', 'اسم المستخدم الثاني', 'user2@alamira.com');

-- ------------------------------------------------------------------------------
-- 2. ESSENTIAL SYSTEM CONFIGURATION (Neutral Values Only - No Fictional Data)
-- ------------------------------------------------------------------------------
INSERT INTO public.application_settings (key, value)
VALUES 
(
    'company_profile',
    jsonb_build_object(
        'name', 'شركة الأميرة للتوريدات العامة والتجارة',
        'commercial_reg', '',
        'tax_card', '',
        'phone', '',
        'address', '',
        'currency', 'ج.م',
        'invoice_footer_notes', ''
    )
),
(
    'system_parameters',
    jsonb_build_object(
        'low_stock_threshold_default', 5,
        'require_notes_on_adjustments', true,
        'allow_negative_stock', false
    )
)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- NOTE: NO DEMO BUSINESS DATA IS INSERTED.
-- The database starts completely clean with ZERO sample categories, suppliers,
-- customers, products, or transactions. All business records must be created
-- by the authorized users through proper business transactions.
-- ------------------------------------------------------------------------------
