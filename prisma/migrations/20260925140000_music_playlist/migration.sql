-- Плейлист фоновой музыки: несколько треков вместо одного файла.
CREATE TABLE "MusicTrack" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MusicTrack_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MusicTrack_position_idx" ON "MusicTrack"("position");
