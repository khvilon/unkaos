INSERT INTO server.configs(uuid, service, name, value) VALUES 
('d0c7629c-a34e-43f2-a621-5a2e68ffe738', 'openai', 'url2', 'https://api.vsegpt.ru/v1/'),
('745d9bb6-dcef-489b-9ca0-9c67b6069d25', 'openai', 'model2', 'anthropic/claude-3-haiku'),
('703d8eb9-e0be-40ca-9143-3c945ec43080', 'openai', 'temperature2', '0.4')
('ec9923d7-3fe1-4e3f-97e0-c696c03d8656', 'openai', 'key2', ''),
('e52d1332-9b59-4bd7-a251-e7f2ce1ea91e', 'openai', 'proxy', '')
('c0e690d4-4828-4992-9016-a70a5a60bf99', 'openai', 'proxy2', '')
ON CONFLICT (uuid) DO NOTHING;

