-- Add setting for auto-email receipts
INSERT INTO app_settings (key, value) 
VALUES ('receipt_email', 'avihaidj0@gmail.com')
ON CONFLICT (key) DO NOTHING;