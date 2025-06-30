
-- Create enum for form field types
CREATE TYPE public.field_type AS ENUM (
  'short_text',
  'paragraph',
  'multiple_choice',
  'checkbox',
  'dropdown',
  'date',
  'file_upload'
);

-- Create users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create forms table
CREATE TABLE public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{
    "allow_multiple_submissions": false,
    "require_auth": false,
    "theme": {
      "primary_color": "#3b82f6",
      "background_color": "#ffffff"
    }
  }'::jsonb,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create form responses table
CREATE TABLE public.form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{
    "time_taken": 0,
    "user_agent": "",
    "ip_address": "",
    "tab_switches": 0
  }'::jsonb,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Forms policies
CREATE POLICY "Users can view their own forms" ON public.forms
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Anyone can view published forms" ON public.forms
  FOR SELECT USING (is_published = true);

CREATE POLICY "Users can create forms" ON public.forms
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own forms" ON public.forms
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own forms" ON public.forms
  FOR DELETE USING (auth.uid() = owner_id);

-- Form responses policies
CREATE POLICY "Form owners can view responses" ON public.form_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.forms 
      WHERE forms.id = form_responses.form_id 
      AND forms.owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can submit responses to published forms" ON public.form_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms 
      WHERE forms.id = form_responses.form_id 
      AND forms.is_published = true
    )
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR each ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update form updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_form_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to update forms updated_at on changes
CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_form_updated_at();
