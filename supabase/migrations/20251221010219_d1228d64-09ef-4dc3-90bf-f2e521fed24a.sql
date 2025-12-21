-- Add approved column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN approved boolean NOT NULL DEFAULT false;

-- Update existing users to be approved (so current users aren't locked out)
UPDATE public.profiles SET approved = true;

-- Create policy for admins to update profiles (for approval)
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy for admins to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));