UPDATE public_data_sync
SET status = 'pending', last_completed_at = NULL, item_count = 0, error_message = NULL
WHERE provider = 'BUSAN_MODEL_FOOD' AND item_count = 0;
