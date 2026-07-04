-- PostGIS Location Helper Functions for UrbanFix
-- Supports location data handling and spatial queries
-- Implements Requirements 21.1, 21.2, 21.3, 21.4, 21.5

-- Function to create a PostGIS point from latitude and longitude
CREATE OR REPLACE FUNCTION create_location_point(lat DOUBLE PRECISION, lon DOUBLE PRECISION)
RETURNS GEOMETRY(POINT, 4326)
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT ST_SetSRID(ST_MakePoint(lon, lat), 4326);
$$;

-- Function to extract latitude from a PostGIS point
CREATE OR REPLACE FUNCTION get_latitude(location GEOMETRY(POINT, 4326))
RETURNS DOUBLE PRECISION
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT ST_Y(location);
$$;

-- Function to extract longitude from a PostGIS point
CREATE OR REPLACE FUNCTION get_longitude(location GEOMETRY(POINT, 4326))
RETURNS DOUBLE PRECISION
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT ST_X(location);
$$;

-- Function to calculate distance between two points in kilometers
-- This function is already defined in database.types.ts but included here for completeness
CREATE OR REPLACE FUNCTION calculate_distance_km(lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION, lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION)
RETURNS DOUBLE PRECISION
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT ST_Distance(
        ST_Transform(ST_SetSRID(ST_MakePoint(lon1, lat1), 4326), 3857),
        ST_Transform(ST_SetSRID(ST_MakePoint(lon2, lat2), 4326), 3857)
    ) / 1000.0;
$$;

-- Function to find technicians within a certain radius of a customer location
CREATE OR REPLACE FUNCTION find_nearby_technicians(
    customer_lat DOUBLE PRECISION,
    customer_lon DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 25.0
)
RETURNS TABLE (
    technician_id UUID,
    distance_km DOUBLE PRECISION,
    full_name TEXT,
    shop_address TEXT,
    avg_rating DOUBLE PRECISION,
    is_available BOOLEAN
)
LANGUAGE SQL
STABLE
AS $$
    SELECT 
        tp.user_id,
        calculate_distance_km(customer_lat, customer_lon, get_latitude(cp.location), get_longitude(cp.location)) as distance_km,
        u.full_name,
        tp.shop_address,
        technician_avg_rating(tp.user_id) as avg_rating,
        tp.is_available
    FROM technician_profiles tp
    JOIN users u ON u.id = tp.user_id
    LEFT JOIN customer_profiles cp ON cp.user_id = tp.user_id
    WHERE tp.verification_status = 'approved'
    AND tp.is_available = true
    AND cp.location IS NOT NULL
    AND calculate_distance_km(customer_lat, customer_lon, get_latitude(cp.location), get_longitude(cp.location)) <= radius_km
    ORDER BY distance_km ASC, avg_rating DESC;
$$;

-- Function to validate that a location point is within Nigeria's approximate boundaries
CREATE OR REPLACE FUNCTION is_location_in_nigeria(location GEOMETRY(POINT, 4326))
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT 
        ST_Y(location) BETWEEN 4.0 AND 14.0 AND  -- Latitude bounds for Nigeria
        ST_X(location) BETWEEN 2.5 AND 15.0;    -- Longitude bounds for Nigeria
$$;

-- Function to update customer location with validation
CREATE OR REPLACE FUNCTION update_customer_location(
    p_user_id UUID,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_address_text TEXT
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
    new_location GEOMETRY(POINT, 4326);
BEGIN
    -- Create the location point
    new_location := create_location_point(p_latitude, p_longitude);
    
    -- Validate the location is within Nigeria
    IF NOT is_location_in_nigeria(new_location) THEN
        RAISE EXCEPTION 'Location must be within Nigeria';
    END IF;
    
    -- Update the customer profile
    UPDATE customer_profiles 
    SET 
        location = new_location,
        address_text = p_address_text,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

-- Function to get formatted location data for a customer
CREATE OR REPLACE FUNCTION get_customer_location_data(p_user_id UUID)
RETURNS TABLE (
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address_text TEXT,
    has_location BOOLEAN
)
LANGUAGE SQL
STABLE
AS $$
    SELECT 
        CASE WHEN cp.location IS NOT NULL THEN get_latitude(cp.location) ELSE NULL END as latitude,
        CASE WHEN cp.location IS NOT NULL THEN get_longitude(cp.location) ELSE NULL END as longitude,
        cp.address_text,
        cp.location IS NOT NULL as has_location
    FROM customer_profiles cp
    WHERE cp.user_id = p_user_id;
$$;

-- Create spatial indexes for performance (if not already exist)
DO $$
BEGIN
    -- Index for customer locations
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'customer_profiles' 
        AND indexname = 'idx_customer_profiles_location'
    ) THEN
        CREATE INDEX idx_customer_profiles_location ON customer_profiles USING GIST(location);
    END IF;
END
$$;