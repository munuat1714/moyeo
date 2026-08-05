DELETE FROM public_data_sync WHERE provider = 'KHS_HERITAGE';
UPDATE public_places SET active = 0 WHERE provider = 'KHS_HERITAGE';
