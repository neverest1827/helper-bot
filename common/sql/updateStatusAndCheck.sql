UPDATE requests
SET status_id = (
    SELECT id FROM statuses WHERE value = ?
),
    paycheck = ?,
    update_date = CURRENT_TIMESTAMP
WHERE id = ?;