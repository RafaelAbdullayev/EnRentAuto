-- Пометка «тестовый заказ»: такие брони не учитываются в выручке и статистике
-- и не занимают даты автомобиля. Нужна, чтобы убрать из отчётов суммы,
-- накопившиеся при проверке сайта, не удаляя сами записи.
ALTER TABLE "Booking" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Booking_isTest_status_idx" ON "Booking"("isTest", "status");
