INSERT INTO storage.buckets (id, name, public)
VALUES ('test-screenshots', 'test-screenshots', true)
ON CONFLICT DO NOTHING;
