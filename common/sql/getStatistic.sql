SELECT
    r.id,
    r.address,
    r.paycheck,
    s.value AS status,
    r.update_date
FROM
    requests r
        LEFT JOIN chats c ON r.chat_id = c.id
        LEFT JOIN statuses s ON r.status_id = s.id
WHERE
        c.chat_id = ?
  AND
    r.update_date = ?
  AND
    r.status_id != 1
