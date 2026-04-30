-- Temporarily drop the trigger to debug user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate with explicit schema qualification and SET search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::public.user_role,
      'owner'::public.user_role
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
