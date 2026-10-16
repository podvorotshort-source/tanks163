// Поколения облика танка (по ступеням).

export const TIER_NAMES = [
  'Игрушка', 'Радиомодель', 'Масштабная копия', 'Настоящий танк',
  'Современный ОБТ', 'Сверхтяжёлый танк', 'Сухопутный дредноут', 'Планетарный титан',
];

export const TIER_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

/** Поколение, которое сейчас отображается (меняется в момент эволюции). */
let displayTier = 0;

export function setDisplayTier(t: number): void {
  displayTier = Math.max(0, Math.min(7, t));
}

export function tierOf(_stageIdx: number): number {
  return displayTier;
}

/** Визуальное увеличение спрайта с поколением (коллизия не меняется). */
export function tierScale(t: number): number {
  return 1 + t * 0.025;
}
