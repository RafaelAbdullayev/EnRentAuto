-- Оценка работы разработчика от посетителей: один голос на анонимный cookie.
CREATE TABLE "DeveloperRating" (
    "id" TEXT NOT NULL,
    "sid" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeveloperRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeveloperRating_sid_key" ON "DeveloperRating"("sid");
CREATE INDEX "DeveloperRating_createdAt_idx" ON "DeveloperRating"("createdAt");
