UPDATE requests
SET status_id = (
    SELECT id FROM statuses WHERE value = ?
),
    update_time = CURRENT_TIMESTAMP
WHERE id = ?;