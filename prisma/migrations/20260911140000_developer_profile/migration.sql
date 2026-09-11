-- Визитка разработчика для страницы «О сайте».
CREATE TABLE "DeveloperProfile" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT '',
    "tagline" TEXT NOT NULL DEFAULT '',
    "about" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "years" INTEGER NOT NULL DEFAULT 0,
    "projects" INTEGER NOT NULL DEFAULT 0,
    "phone" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "telegram" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "github" TEXT NOT NULL DEFAULT '',
    "linkedin" TEXT NOT NULL DEFAULT '',
    "instagram" TEXT NOT NULL DEFAULT '',
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priceNote" TEXT NOT NULL DEFAULT '',
    "translations" JSONB,
    "sourceHash" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeveloperProfile_pkey" PRIMARY KEY ("id")
);
