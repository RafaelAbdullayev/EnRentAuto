import { ImageResponse } from 'next/og';

/**
 * Иконка сайта во вкладке браузера и в закладках.
 *
 * Рисуется кодом, а не файлом: логотип у нас горизонтальный, с надписью —
 * в квадрате 32×32 от него осталась бы нечитаемая полоска. Поэтому в иконке
 * монограмма в фирменных цветах.
 */
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #e2cd9c 0%, #9c7f43 100%)',
          color: '#050506',
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: -0.5,
          borderRadius: 7,
        }}
      >
        ER
      </div>
    ),
    size,
  );
}
