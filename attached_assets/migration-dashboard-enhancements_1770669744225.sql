-- ============================================
-- PCB AUTO DASHBOARD ENHANCEMENT MIGRATION
-- Run this ONCE against your database
-- Safe to run multiple times (IF NOT EXISTS)
-- ============================================

-- ============================================
-- 1. ENHANCE pcb_bays: add sellable hours
-- ============================================
ALTER TABLE pcb_bays
  ADD COLUMN IF NOT EXISTS sellable_hours_per_day DECIMAL(4,1) DEFAULT 8.0,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

COMMENT ON COLUMN pcb_bays.sellable_hours_per_day IS 'How many billable hours this bay can produce per day';

-- ============================================
-- 2. STAFF AVAILABILITY (weekly schedule)
-- ============================================
CREATE TABLE IF NOT EXISTS pcb_staff_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  employee_id UUID NOT NULL REFERENCES pcb_employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sunday
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  is_working BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, employee_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_pcb_staff_avail_tenant
  ON pcb_staff_availability(tenant_id, employee_id);

ALTER TABLE pcb_staff_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS pcb_staff_avail_tenant_policy ON pcb_staff_availability
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- ============================================
-- 3. STAFF TIME OFF (specific dates)
-- ============================================
CREATE TABLE IF NOT EXISTS pcb_staff_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  employee_id UUID NOT NULL REFERENCES pcb_employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason VARCHAR(255),
  is_full_day BOOLEAN DEFAULT TRUE,
  start_time TIME,  -- only if is_full_day = false
  end_time TIME,    -- only if is_full_day = false
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_pcb_time_off_tenant
  ON pcb_staff_time_off(tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_pcb_time_off_employee
  ON pcb_staff_time_off(employee_id, date);

ALTER TABLE pcb_staff_time_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS pcb_time_off_tenant_policy ON pcb_staff_time_off
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- ============================================
-- 4. DASHBOARD VISIBILITY (role-based card toggles)
-- ============================================
CREATE TABLE IF NOT EXISTS pcb_dashboard_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  card_key VARCHAR(50) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN (
    'owner', 'admin', 'service_advisor', 'technician', 'bookkeeper'
  )),
  is_visible BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, card_key, role)
);

CREATE INDEX IF NOT EXISTS idx_pcb_dash_vis_tenant
  ON pcb_dashboard_visibility(tenant_id, role);

ALTER TABLE pcb_dashboard_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS pcb_dash_vis_tenant_policy ON pcb_dashboard_visibility
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Insert default visibility settings for a tenant
-- (Run this per tenant, or handle in application code on first load)
-- card_keys: revenue, cars_in_shop, aro, approval_rate, fees_saved,
--            appointments_availability, open_ros, quick_actions, shop_stats

-- ============================================
-- 5. ADD estimated_labor_hours TO pcb_appointments
-- ============================================
ALTER TABLE pcb_appointments
  ADD COLUMN IF NOT EXISTS estimated_labor_hours DECIMAL(5,2);

COMMENT ON COLUMN pcb_appointments.estimated_labor_hours IS 'Total estimated labor hours for this appointment. Auto-calculated from service lines if linked to an RO.';

-- ============================================
-- 6. ADD estimated_hours TO service_lines
-- ============================================
-- Check if your service_lines table is named pcb_service_lines or service_lines
-- Adjust the table name below to match your actual schema

ALTER TABLE pcb_service_lines
  ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2);

COMMENT ON COLUMN pcb_service_lines.estimated_hours IS 'Estimated labor hours for this line item. Used for bay capacity calculations.';

-- ============================================
-- 7. HELPER VIEW: Today's shop capacity
-- ============================================
CREATE OR REPLACE VIEW pcb_shop_capacity AS
SELECT
  b.tenant_id,
  b.id AS bay_id,
  b.bay_number,
  b.name AS bay_name,
  b.sellable_hours_per_day,
  COALESCE(SUM(a.estimated_labor_hours), 0) AS hours_booked,
  b.sellable_hours_per_day - COALESCE(SUM(a.estimated_labor_hours), 0) AS hours_available,
  COUNT(a.id) AS appointment_count,
  CURRENT_DATE AS calc_date
FROM pcb_bays b
LEFT JOIN pcb_appointments a
  ON a.bay_id = b.id
  AND a.scheduled_start::date = CURRENT_DATE
  AND a.status NOT IN ('cancelled', 'no_show')
WHERE b.active = TRUE
GROUP BY b.id, b.tenant_id, b.bay_number, b.name, b.sellable_hours_per_day;

-- ============================================
-- DONE
-- ============================================
