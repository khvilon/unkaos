INSERT INTO public.gadget_types (uuid, name, code) VALUES 
('bfa1e4bf-f635-4eeb-89e9-c9c04c39b366', 'Диаграмма сгорания', 'Burndown')
ON CONFLICT (uuid) DO NOTHING;