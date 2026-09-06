-- Одноразовые коды входа в «Мои брони»: клиент часто не записывает номер
-- заказа, поэтому вторым способом входа служит код, присланный на e-mail,
-- указанный при бронировании.
CREATE TABLE "AccessCode" (
    "id" TEXT NOT NULL,
    "phoneDigits" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccessCode_phoneDigits_idx" ON "AccessCode"("phoneDigits");
CREATE INDEX "AccessCode_expiresAt_idx" ON "AccessCode"("expiresAt");
