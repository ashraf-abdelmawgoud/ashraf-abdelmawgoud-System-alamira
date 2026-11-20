-- =========================================================================
-- AL-AMIRA ERP V2 — Database Safeguards: Primary Administrator Protection
-- File: supabase/proposed_primary_admin_protection.sql
--
-- Target Primary Admin UUID: 040bda71-7ffa-4a17-94d8-ff9cd72aed5d
-- Purpose:
-- 1. Prevent accidental or unauthorized deletion of the primary administrator.
-- 2. Prevent deactivation (is_active = false) of the primary administrator.
-- 3. Prevent role downgrade (role != 'ADMIN') of the primary administrator.
--
-- Note: Proposed idempotent script. Review before applying to production.
-- =========================================================================

-- 1. Create or replace the protection trigger function
CREATE OR REPLACE FUNCTION public.fn_protect_primary_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_primary_admin_id CONSTANT uuid := '040bda71-7ffa-4a17-94d8-ff9cd72aed5d'::uuid;
BEGIN
  -- Check for DELETE operation
  IF TG_OP = 'DELETE' THEN
    IF OLD.user_id = v_primary_admin_id THEN
      RAISE EXCEPTION 'لا يمكن تعطيل أو حذف حساب المدير الأساسي (Primary Administrator is protected).'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;

  -- Check for UPDATE operation
  IF TG_OP = 'UPDATE' THEN
    IF OLD.user_id = v_primary_admin_id THEN
      -- Prevent deactivation
      IF NEW.is_active = FALSE THEN
        RAISE EXCEPTION 'لا يمكن تعطيل أو حذف حساب المدير الأساسي (Primary Administrator cannot be deactivated).'
          USING ERRCODE = 'P0002';
      END IF;

      -- Prevent role change
      IF NEW.role <> 'ADMIN' THEN
        RAISE EXCEPTION 'لا يمكن تعديل صلاحيات أو خفض دور حساب المدير الأساسي (Primary Administrator role must remain ADMIN).'
          USING ERRCODE = 'P0003';
      END IF;

      -- Ensure UUID cannot be changed
      IF NEW.user_id <> OLD.user_id THEN
        RAISE EXCEPTION 'لا يمكن تغيير المعرف الرقمي للمدير الأساسي.'
          USING ERRCODE = 'P0004';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Safely attach trigger to public.authorized_users table
DROP TRIGGER IF EXISTS trg_protect_primary_admin ON public.authorized_users;

CREATE TRIGGER trg_protect_primary_admin
  BEFORE UPDATE OR DELETE ON public.authorized_users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_protect_primary_admin();

-- 3. Verification query (Optional test to confirm trigger installation)
-- SELECT event_object_table, trigger_name, action_timing, event_manipulation 
-- FROM information_schema.triggers 
-- WHERE trigger_name = 'trg_protect_primary_admin';
