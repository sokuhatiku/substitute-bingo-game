/**
 * value以上で最小の「1, 2, 5 × 10^n」を返す（グラフ縦軸の上限を切りよく決めるための関数）。
 * value <= 0 の場合は 1 を返す。
 */
export function niceCeil(value: number): number {
	if (value <= 0) {
		return 1;
	}
	const mantissas = [1, 2, 5];
	const base = Math.pow(10, Math.floor(log10(value)));
	for (let i = 0; i < mantissas.length; i++) {
		// 浮動小数点誤差で境界値がわずかに大きくなっていても1段上に繰り上げないよう、相対誤差を許容して比較する
		if (mantissas[i] * base >= value * (1 - 1e-9)) {
			return mantissas[i] * base;
		}
	}
	return 10 * base;
}

/**
 * 確率(0〜1)をパーセント表記の文字列に整形する。
 * 値の桁数に応じて小数点以下の桁数を決めるため、極端に小さい値でも指数表記にならない（例: "50%" "0.5%" "0.0005%"）。
 * @param value 確率（0〜1）
 * @param extraDigits 追加で表示する小数点以下の桁数
 */
export function formatPercent(value: number, extraDigits: number = 0): string {
	const percent = value * 100;
	if (percent <= 0) {
		return "0%";
	}
	const digits = Math.max(0, -Math.floor(log10(percent))) + extraDigits;
	return `${percent.toFixed(digits)}%`;
}

/** 常用対数（実行環境がES5のためMath.log10は使えない） */
function log10(value: number): number {
	return Math.log(value) / Math.LN10;
}
