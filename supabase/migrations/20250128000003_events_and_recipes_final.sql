-- ENUM for Event Types
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
        CREATE TYPE event_type AS ENUM ('BANQUET', 'A_LA_CARTE', 'COFFEE', 'BUFFET', 'SPORTS_MULTI');
    END IF;
END $$;

-- Update events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS date_end TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS pax INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type event_type DEFAULT 'BANQUET';
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Event Menus (link events to recipes)
CREATE TABLE IF NOT EXISTS event_menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  qty_forecast INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Direct Ingredients (for SPORTS_MULTI)
CREATE TABLE IF NOT EXISTS event_direct_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(12,4) NOT NULL,
  unit_id UUID NOT NULL REFERENCES units(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE event_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_direct_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization isolation for event_menus" ON event_menus FOR ALL
  USING (event_id IN (SELECT id FROM events));

CREATE POLICY "Organization isolation for event_direct_ingredients" ON event_direct_ingredients FOR ALL
  USING (event_id IN (SELECT id FROM events));

-- Final tables list for RLS (ensure all have policies)
-- (recipes already has it from previous migration)
