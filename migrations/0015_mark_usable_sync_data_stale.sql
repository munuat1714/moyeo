UPDATE public_data_sync
SET status = 'stale'
WHERE status = 'failed' AND item_count > 0;
