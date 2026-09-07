-- Что показывать фоном первого экрана:
--   media — загруженная фотография или видео (как было);
--   cars  — слайдшоу из фотографий автопарка.
ALTER TABLE "Settings" ADD COLUMN "heroMode" TEXT NOT NULL DEFAULT 'media';
