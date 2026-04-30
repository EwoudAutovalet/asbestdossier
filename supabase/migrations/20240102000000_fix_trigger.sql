-- Fix the handle_new_user trigger to handle NULL metadata gracefully
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role user_role;
  _name TEXT;
BEGIN
  _name := '';
  _role := 'owner';

  IF NEW.raw_user_meta_data IS NOT NULL THEN
    _name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
      BEGIN
        _role := (NEW.raw_user_meta_data->>'role')::user_role;
      EXCEPTION WHEN OTHERS THEN
        _role := 'owner';
      END;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, _name, _role);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
