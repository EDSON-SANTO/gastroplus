
-- Roles enum and user_roles table (separate, per security best practice)
CREATE TYPE public.app_role AS ENUM ('user', 'owner', 'admin');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Trigger: auto-create profile + default 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'user'));

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Restaurants
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  cover_image TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_restaurants_status ON public.restaurants(status);
CREATE INDEX idx_restaurants_owner ON public.restaurants(owner_id);

CREATE TABLE public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_menu_categories_restaurant ON public.menu_categories(restaurant_id);

CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image TEXT,
  ingredients TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_menu_items_restaurant ON public.menu_items(restaurant_id);

CREATE TABLE public.restaurant_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_restaurant_images_restaurant ON public.restaurant_images(restaurant_id);

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_restaurant ON public.reviews(restaurant_id);

CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, restaurant_id)
);

CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles viewable by self" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles updatable by self" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- user_roles policies (read own; admins manage)
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Restaurants policies
CREATE POLICY "Public can see approved restaurants" ON public.restaurants FOR SELECT USING (status = 'approved' OR auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners create own restaurants" ON public.restaurants FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update own restaurants" ON public.restaurants FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners delete own restaurants" ON public.restaurants FOR DELETE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

-- Helper: a restaurant is publicly visible
CREATE OR REPLACE FUNCTION public.restaurant_is_public(_rid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.restaurants WHERE id = _rid AND status = 'approved')
$$;

CREATE OR REPLACE FUNCTION public.is_restaurant_owner(_rid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.restaurants WHERE id = _rid AND owner_id = auth.uid())
$$;

-- Menu categories
CREATE POLICY "Categories public when restaurant approved" ON public.menu_categories FOR SELECT USING (public.restaurant_is_public(restaurant_id) OR public.is_restaurant_owner(restaurant_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners manage categories" ON public.menu_categories FOR ALL USING (public.is_restaurant_owner(restaurant_id) OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.is_restaurant_owner(restaurant_id) OR public.has_role(auth.uid(),'admin'));

-- Menu items
CREATE POLICY "Items public when restaurant approved" ON public.menu_items FOR SELECT USING (public.restaurant_is_public(restaurant_id) OR public.is_restaurant_owner(restaurant_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners manage items" ON public.menu_items FOR ALL USING (public.is_restaurant_owner(restaurant_id) OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.is_restaurant_owner(restaurant_id) OR public.has_role(auth.uid(),'admin'));

-- Restaurant images
CREATE POLICY "Images public when restaurant approved" ON public.restaurant_images FOR SELECT USING (public.restaurant_is_public(restaurant_id) OR public.is_restaurant_owner(restaurant_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners manage images" ON public.restaurant_images FOR ALL USING (public.is_restaurant_owner(restaurant_id) OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.is_restaurant_owner(restaurant_id) OR public.has_role(auth.uid(),'admin'));

-- Reviews
CREATE POLICY "Reviews public for approved restaurants" ON public.reviews FOR SELECT USING (public.restaurant_is_public(restaurant_id) OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated can create review" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own review" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own review" ON public.reviews FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Favorites
CREATE POLICY "Users see own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users add favorite" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove favorite" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Promotions
CREATE POLICY "Promotions public when restaurant approved" ON public.promotions FOR SELECT USING (public.restaurant_is_public(restaurant_id) OR public.is_restaurant_owner(restaurant_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners manage promotions" ON public.promotions FOR ALL USING (public.is_restaurant_owner(restaurant_id) OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.is_restaurant_owner(restaurant_id) OR public.has_role(auth.uid(),'admin'));

-- Storage bucket for restaurant + dish images
INSERT INTO storage.buckets (id, name, public) VALUES ('restaurant-images', 'restaurant-images', true);

CREATE POLICY "Public read restaurant images" ON storage.objects FOR SELECT USING (bucket_id = 'restaurant-images');
CREATE POLICY "Authenticated upload restaurant images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'restaurant-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Owners update own restaurant images" ON storage.objects FOR UPDATE USING (bucket_id = 'restaurant-images' AND auth.uid() = owner);
CREATE POLICY "Owners delete own restaurant images" ON storage.objects FOR DELETE USING (bucket_id = 'restaurant-images' AND auth.uid() = owner);
