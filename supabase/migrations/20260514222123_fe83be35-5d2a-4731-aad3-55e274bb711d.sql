
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS rating numeric(2,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_time text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS logo text;
