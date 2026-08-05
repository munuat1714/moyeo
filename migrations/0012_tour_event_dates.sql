ALTER TABLE public_places ADD COLUMN event_start_date TEXT NOT NULL DEFAULT '';
ALTER TABLE public_places ADD COLUMN event_end_date TEXT NOT NULL DEFAULT '';

-- 일반 장소 목록에서 들어온 기간 미확인 축제는 즉시 추천에서 제외합니다.
UPDATE public_places
SET active = 0
WHERE provider = 'TOUR_API' AND category = '공연·축제';

CREATE INDEX idx_public_places_event_dates
  ON public_places (category, event_start_date, event_end_date, active);
