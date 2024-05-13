INSERT INTO server.configs(uuid, service, name, value) VALUES 
('d0c7629c-a34e-43f2-a621-5a2e68ffe735', 'openai', 'url3', 'https://api.vsegpt.ru/v1/'),
('745d9bb6-dcef-489b-9ca0-9c67b6069d65', 'openai', 'model3', 'anthropic/claude-3-haiku'),
('703d8eb9-e0be-40ca-9143-3c945ec43780', 'openai', 'temperature3', '0.4'),
('ec9923d7-3fe1-4e3f-97e0-c690c03d8696', 'openai', 'key3', ''),
('c0e690d4-4828-4992-9016-a77a5a60bf99', 'openai', 'proxy3', '')
ON CONFLICT (uuid) DO NOTHING;