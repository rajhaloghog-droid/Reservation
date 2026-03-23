
SELECT
  vehicle_id,
  date,
  start_time,
  end_time,
  COUNT(*) AS duplicates,
  GROUP_CONCAT(id ORDER BY id) AS booking_ids
FROM bookings
GROUP BY vehicle_id, date, start_time, end_time
HAVING COUNT(*) > 1;
