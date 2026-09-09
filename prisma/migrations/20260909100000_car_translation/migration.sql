-- Переводы описания и опций автомобиля на языки сайта.
-- Базовый (русский) текст остаётся в таблице "Car"; здесь лежат остальные языки.
CREATE TABLE "CarTranslation" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceHash" TEXT NOT NULL DEFAULT '',
    "isAuto" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CarTranslation_carId_locale_key" ON "CarTranslation"("carId", "locale");
CREATE INDEX "CarTranslation_carId_idx" ON "CarTranslation"("carId");

ALTER TABLE "CarTranslation" ADD CONSTRAINT "CarTranslation_carId_fkey"
    FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
