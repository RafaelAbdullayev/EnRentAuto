-- Редактируемые тексты сайта.
--
-- Хранит переопределения строк интерфейса, заданные администратором.
-- Значения по умолчанию остаются в файлах messages/<locale>.json;
-- запись здесь перекрывает файл для конкретной пары (язык, ключ).
CREATE TABLE "SiteText" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteText_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SiteText_locale_idx" ON "SiteText"("locale");

CREATE UNIQUE INDEX "SiteText_locale_key_key" ON "SiteText"("locale", "key");
