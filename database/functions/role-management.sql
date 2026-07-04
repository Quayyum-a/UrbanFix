-- Role Management Functions for UrbanFix
-- Enforces immutable role assignment and role-based access control
-- Implements Requirements 2.4, 2.5

-- Function to enforce role immutability (prevent role changes)
CREATE OR REPLACE FUNCTION enforce_role_immutability()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
    -- Allow initial role assignment (INSERT) but prevent role changes (UPDATE)
    IF TG_OP = 'UPDATE' AND OLD.role IS NOT NULL AND NEW.role != OLD.role THEN
        RAISE EXCEPTION 'User roles cannot be changed once assigned. Current role: %, attempted role: %', OLD.role, NEW.role;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to enforce role immutability
DROP TRIGGER IF EXISTS trigger_enforce_role_immutability ON users;
CREATE TRIGGER trigger_enforce_role_immutability
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION enforce_role_immutability();

-- Function to validate role assignment during profile creation
CREATE OR REPLACE FUNCTION validate_role_profile_consistency()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
    -- Check if user exists and get their role
    IF TG_TABLE_NAME = 'customer_profiles' THEN
        -- Ensure user has customer role
        IF NOT EXISTS (
            SELECT 1 FROM users 
            WHERE id = NEW.user_id 
            AND role = 'customer'
        ) THEN
            RAISE EXCEPTION 'Customer profiles can only be created for users with customer role';
        END IF;
    ELSIF TG_TABLE_NAME = 'technician_profiles' THEN
        -- Ensure user has technician role
        IF NOT EXISTS (
            SELECT 1 FROM users 
            WHERE id = NEW.user_id 
            AND role = 'technician'
        ) THEN
            RAISE EXCEPTION 'Technician profiles can only be created for users with technician role';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create triggers for profile creation validation
DROP TRIGGER IF EXISTS trigger_validate_customer_role ON customer_profiles;
CREATE TRIGGER trigger_validate_customer_role
    BEFORE INSERT OR UPDATE ON customer_profiles
    FOR EACH ROW
    EXECUTE FUNCTION validate_role_profile_consistency();

DROP TRIGGER IF EXISTS trigger_validate_technician_role ON technician_profiles;
CREATE TRIGGER trigger_validate_technician_role
    BEFORE INSERT OR UPDATE ON technician_profiles
    FOR EACH ROW
    EXECUTE FUNCTION validate_role_profile_consistency();

-- Function to get user role (already defined in database.types.ts)
-- This is a convenience function for RLS policies
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT role::TEXT FROM users WHERE id = auth.uid();
$$;

-- Function to check if current user is a customer
CREATE OR REPLACE FUNCTION is_current_user_customer()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'customer'
    );
$$;

-- Function to check if current user is a technician
CREATE OR REPLACE FUNCTION is_current_user_technician()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'technician'
    );
$$;

-- Function to check if current user is an admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
$$;

-- Function to check if current user is an approved technician
CREATE OR REPLACE FUNCTION is_current_user_approved_technician()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM users u
        JOIN technician_profiles tp ON u.id = tp.user_id
        WHERE u.id = auth.uid() 
        AND u.role = 'technician'
        AND tp.verification_status = 'approved'
    );
$$;

-- Function to prevent unauthorized role-specific operations
CREATE OR REPLACE FUNCTION validate_role_based_operation(
    required_role TEXT,
    operation_description TEXT DEFAULT 'operation'
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
    current_role TEXT;
BEGIN
    -- Get current user's role
    SELECT role INTO current_role FROM users WHERE id = auth.uid();
    
    -- Check if user has required role
    IF current_role != required_role THEN
        RAISE EXCEPTION 'Access denied: % requires % role, but user has % role', 
            operation_description, required_role, COALESCE(current_role, 'no role');
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Function to validate technician is approved for operations
CREATE OR REPLACE FUNCTION validate_technician_approved()
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
    IF NOT is_current_user_approved_technician() THEN
        RAISE EXCEPTION 'Access denied: Operation requires approved technician status';
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Function to audit role-related changes
CREATE OR REPLACE FUNCTION audit_role_changes()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
    -- Log role assignments and profile creations
    INSERT INTO audit_logs (
        user_id,
        table_name,
        operation,
        record_id,
        timestamp
    ) VALUES (
        COALESCE(NEW.id, NEW.user_id, OLD.id, OLD.user_id),
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id)::TEXT,
        NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create audit triggers for role-related operations
DROP TRIGGER IF EXISTS trigger_audit_user_changes ON users;
CREATE TRIGGER trigger_audit_user_changes
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_role_changes();

DROP TRIGGER IF EXISTS trigger_audit_customer_profile_changes ON customer_profiles;
CREATE TRIGGER trigger_audit_customer_profile_changes
    AFTER INSERT OR UPDATE OR DELETE ON customer_profiles
    FOR EACH ROW
    EXECUTE FUNCTION audit_role_changes();

DROP TRIGGER IF EXISTS trigger_audit_technician_profile_changes ON technician_profiles;
CREATE TRIGGER trigger_audit_technician_profile_changes
    AFTER INSERT OR UPDATE OR DELETE ON technician_profiles
    FOR EACH ROW
    EXECUTE FUNCTION audit_role_changes();