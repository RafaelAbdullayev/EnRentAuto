-- Нормализованный номер телефона клиента: только цифры.
-- Нужен, чтобы клиент видел все свои брони на странице «Мои брони»:
-- в поле phone номер лежит так, как его ввёл человек, и одинаковые номера
-- в разных бронях могут отличаться пробелами и скобками.
ALTER TABLE "Booking" ADD COLUMN "phoneDigits" TEXT NOT NULL DEFAULT '';

-- Заполняем по уже существующим заказам.
UPDATE "Booking" SET "phoneDigits" = regexp_replace("phone", '\D', '', 'g');

CREATE INDEX "Booking_phoneDigits_idx" ON "Booking"("phoneDigits");
