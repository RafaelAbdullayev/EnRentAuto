-- Размер логотипа, задаваемый в админке: проценты от обычного размера.
ALTER TABLE "Settings" ADD COLUMN "logoScale" INTEGER NOT NULL DEFAULT 100;
