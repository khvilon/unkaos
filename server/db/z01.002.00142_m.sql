INSERT INTO server.gadget_types (uuid, name, code) VALUES 
('bfa1e4bf-f635-4eeb-89e9-c9c04c39b366', 'График сгорания?', 'TimeReport')
ON CONFLICT (uuid) DO NOTHING;