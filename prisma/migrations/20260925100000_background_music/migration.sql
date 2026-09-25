-- Фоновая музыка: включатель и громкость по умолчанию.
ALTER TABLE "Settings" ADD COLUMN "musicEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN "musicVolume" INTEGER NOT NULL DEFAULT 15;
