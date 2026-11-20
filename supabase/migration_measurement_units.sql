-- ==============================================================================
-- AL-AMIRA ERP V2 — MEASUREMENT UNITS PERSISTENCE MIGRATION
-- File: supabase/migration_measurement_units.sql
-- Description:
--   1. Relaxes restrictive CHECK constraint on public.products(unit) that previously
--      prevented saving valid measurement units outside 6 hardcoded strings.
--   2. Establishes shared persistent storage table for administrator-created custom units.
--   3. Configures secure Row-Level Security (RLS) policies.
--   4. Fully preserves all existing products, transactions, and inventory history.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ROOT CAUSE INVESTIGATION & CONSTRAINT RELAXATION
-- ------------------------------------------------------------------------------
-- Root Cause: In supabase/schema.sql line 55, public.products had:
--   CHECK (unit IN ('قطعة', 'متر', 'كجم', 'لفة', 'كرتونة', 'علبة', 'وحدة مخصصة'))
-- This prevented storing legitimate Arabic & standard measurement units (such as
-- 'كيلو جرام', 'جرام', 'طن', 'لتر', 'شوال', 'صندوق', etc.) or user-defined custom units,
-- forcing the database or users to record the literal text 'وحدة مخصصة'.
--
-- Safe Resolution:
-- Replace the restrictive enum-like CHECK with a validation constraint ensuring
-- the unit is a non-empty, clean text string.

ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_unit_check;

ALTER TABLE public.products
ADD CONSTRAINT products_unit_check CHECK (char_length(TRIM(unit)) > 0);

COMMENT ON COLUMN public.products.unit IS 
'وحدة التعامل والقياس للصنف (مثل: قطعة، متر، كرتونة، شوال، أو أي وحدة مخصصة معتمدة). لا تقبل قيماً فارغة.';

-- ------------------------------------------------------------------------------
-- 2. CREATE SHARED CUSTOM MEASUREMENT UNITS TABLE
-- ------------------------------------------------------------------------------
-- Enables persistent, shared custom units defined by administrators across all
-- devices and user sessions, instead of relying solely on browser localStorage.

CREATE TABLE IF NOT EXISTS public.custom_measurement_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.authorized_users(user_id),
    CONSTRAINT custom_measurement_units_name_check CHECK (
        char_length(TRIM(unit_name)) > 0 AND 
        char_length(TRIM(unit_name)) <= 30
    )
);

COMMENT ON TABLE public.custom_measurement_units IS 
'جدول وحدات القياس المخصصة الإضافية التي يقوم مديرو النظام بإنشائها لتشاركها بين جميع مستخدمي النظام.';

-- Index for fast case-insensitive lookup and deduplication
CREATE INDEX IF NOT EXISTS idx_custom_measurement_units_name_lower 
ON public.custom_measurement_units (LOWER(TRIM(unit_name)));

-- ------------------------------------------------------------------------------
-- 3. ROW-LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.custom_measurement_units ENABLE ROW LEVEL SECURITY;

-- Any authorized active user (ADMIN or SALES_OPERATOR) can read custom units
DROP POLICY IF EXISTS "custom_units_select_policy" ON public.custom_measurement_units;
CREATE POLICY "custom_units_select_policy" ON public.custom_measurement_units
    FOR SELECT TO authenticated
    USING (public.is_authorized_user());

-- Only administrators (ADMIN) can insert new custom units
DROP POLICY IF EXISTS "custom_units_insert_policy" ON public.custom_measurement_units;
CREATE POLICY "custom_units_insert_policy" ON public.custom_measurement_units
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

-- Only administrators (ADMIN) can delete custom units
DROP POLICY IF EXISTS "custom_units_delete_policy" ON public.custom_measurement_units;
CREATE POLICY "custom_units_delete_policy" ON public.custom_measurement_units
    FOR DELETE TO authenticated
    USING (public.is_admin());

COMMIT;
