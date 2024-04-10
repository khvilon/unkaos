INSERT INTO server.configs(uuid, service, name, value) VALUES 
('164772f8-6eab-4f37-8195-a72bcde5e8d9', 'openai', 'url', 'https://api.vsegpt.ru/v1/'),
('1aadb1a6-a974-4216-bfd6-cca382e05058', 'openai', 'model', 'openai/gpt-3.5-turbo-instruct'),
('9fb610a2-959c-41d8-8424-0e16901a5b2a', 'openai', 'temperature', '0.4')
ON CONFLICT (uuid) DO NOTHING;

