// Детерминированный генератор (sfc32). Симуляция использует только его,
// чтобы забеги воспроизводились в тестах и балансных прогонах.

export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed = 1) {
    this.a = 0x9e3779b9;
    this.b = 0x243f6a88;
    this.c = 0xb7e15162;
    this.d = seed >>> 0;
    for (let i = 0; i < 15; i++) this.next();
  }

  /** [0, 1) */
  next(): number {
    let { a, b, c, d } = this;
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const r = (t + d) | 0;
    c = (c + r) | 0;
    this.a = a; this.b = b; this.c = c; this.d = d;
    return (r >>> 0) / 4294967296;
  }

  range(a: number, b: number): number {
    return a + this.next() * (b - a);
  }

  /** Целое в [a, b] включительно. */
  int(a: number, b: number): number {
    return a + Math.floor(this.next() * (b - a + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /** Выбор по весам: элементы с весом <= 0 не выбираются. Возвращает индекс или -1. */
  weightedIndex(weights: readonly number[]): number {
    let sum = 0;
    for (const w of weights) if (w > 0) sum += w;
    if (sum <= 0) return -1;
    let r = this.next() * sum;
    for (let i = 0; i < weights.length; i++) {
      const w = weights[i];
      if (w <= 0) continue;
      r -= w;
      if (r <= 0) return i;
    }
    for (let i = weights.length - 1; i >= 0; i--) if (weights[i] > 0) return i;
    return -1;
  }

  /** Нормальное распределение (Бокс–Мюллер). */
  gauss(mean = 0, sd = 1): number {
    const u = Math.max(1e-9, this.next()), v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  getState(): number[] {
    return [this.a, this.b, this.c, this.d];
  }

  setState(s: number[]): void {
    [this.a, this.b, this.c, this.d] = s;
  }
}
