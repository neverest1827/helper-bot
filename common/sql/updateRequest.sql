UPDATE requests
SET
    chat_id = ?,
    phone_id = ?,
    name = ?,
    address = ?,
    date_from = ?,
    date_to = ?,
    description = ?,
    admin_notes = ?,
    master_notes = ?,
    paycheck = ?,
    status_id = ?
WHERE id = ?;