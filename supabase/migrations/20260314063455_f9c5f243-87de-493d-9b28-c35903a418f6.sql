
-- Add token and api_key columns to institutions
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS token text UNIQUE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS api_key text UNIQUE;

-- Create function to generate random token
CREATE OR REPLACE FUNCTION public.generate_institution_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := 'INS-';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Create function to generate API key
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := 'mk_';
  i integer;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Auto-generate token and api_key on institution insert
CREATE OR REPLACE FUNCTION public.set_institution_credentials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.token IS NULL THEN
    NEW.token := generate_institution_token();
  END IF;
  IF NEW.api_key IS NULL THEN
    NEW.api_key := generate_api_key();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_institution_credentials
  BEFORE INSERT ON public.institutions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_institution_credentials();

-- Allow token lookup for registration (public read of token only via function)
CREATE OR REPLACE FUNCTION public.verify_institution_token(_token text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.institutions WHERE token = _token LIMIT 1;
$$;
