-- Box integration: attach Box folders/files to articles (policies)

-- 1) Add columns to policies
ALTER TABLE policies
ADD COLUMN IF NOT EXISTS box_folder_id TEXT NULL,
ADD COLUMN IF NOT EXISTS box_file_ids TEXT[] NULL;

-- 2) (Optional) RLS: allow public read of new columns if policies is publicly readable
-- Adjust to match your existing RLS posture.
-- Example (if you already allow SELECT to public):
-- No change needed if your existing policies SELECT already includes these fields.

-- 3) Index (optional): if you plan to filter by folder id
-- CREATE INDEX IF NOT EXISTS policies_box_folder_id_idx ON policies(box_folder_id);

-- After running this, the Admin UI can upsert box_folder_id / box_file_ids,
-- and the article page can render Box Content Explorer with the linked folder.
