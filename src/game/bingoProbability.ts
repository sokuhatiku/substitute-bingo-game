/** ビンゴで使う番号の総数（1〜75） */
const TOTAL_NUMBERS = 75;
/** 5x5シート中央（FREEマス）のビットインデックス */
const FREE_CELL_INDEX = 12;

/**
 * ビンゴの理論確率テーブル。
 * 添字は完了した抽選ターン数（[0]は抽選開始前）。
 */
export interface BingoProbabilityTable {
	/** cumulative[t] = tターン目までにビンゴが成立している確率（[0] = 0） */
	cumulative: number[];
	/** marginal[t] = ちょうどtターン目で初めてビンゴが成立する確率（= cumulative[t] - cumulative[t-1]） */
	marginal: number[];
}

/**
 * ビンゴ確率の理論値テーブルを包除原理で厳密に計算する。
 * 確率はシートの構造（中央FREE・12ライン）だけで決まり、シートの具体的な数字の並びには依存しないため全プレイヤー共通。
 * 乱数を使わない決定的な計算なので、マルチプレイの同期にも影響しない。
 */
export function calculateBingoProbabilityTable(maxTurn: number): BingoProbabilityTable {
	const lineMasks = createLineMasks();
	const lineCount = lineMasks.length;

	// 包除原理: P(tターンまでにビンゴ) = Σ_{空でないラインの部分集合S} (-1)^(|S|+1) × P(Sに含まれる全マスの番号がt回の抽選で全て引かれる)
	// 後者の確率はSに含まれるマスの総数kだけで決まるため、部分集合の列挙結果をkごとの符号付きカウントに集約しておく
	const signedCountByCellCount: number[] = [];
	for (let k = 0; k < 25; k++) {
		signedCountByCellCount.push(0);
	}
	for (let subset = 1; subset < (1 << lineCount); subset++) {
		let union = 0;
		for (let i = 0; i < lineCount; i++) {
			if ((subset & (1 << i)) !== 0) {
				union |= lineMasks[i];
			}
		}
		const sign = popcount(subset) % 2 === 1 ? 1 : -1;
		signedCountByCellCount[popcount(union)] += sign;
	}

	const cumulative: number[] = [0];
	const marginal: number[] = [0];
	for (let t = 1; t <= maxTurn; t++) {
		let probability = 0;
		for (let k = 0; k < signedCountByCellCount.length; k++) {
			if (signedCountByCellCount[k] !== 0) {
				probability += signedCountByCellCount[k] * probabilityAllDrawn(k, t);
			}
		}
		// 浮動小数点誤差でわずかに[0,1]を外れることがあるためクランプする（例: ビンゴが確定する71ターン目で1.0000000000000002になる）
		probability = Math.min(1, Math.max(0, probability));
		cumulative.push(probability);
		marginal.push(probability - cumulative[t - 1]);
	}

	return { cumulative, marginal };
}

/**
 * 12ライン（行5・列5・対角2）をシート25マスのビットマスクで返す。
 * 中央のFREEマスは最初から開いているため、全ラインから除外する。
 */
function createLineMasks(): number[] {
	const masks: number[] = [];
	for (let row = 0; row < 5; row++) {
		let mask = 0;
		for (let col = 0; col < 5; col++) {
			mask |= 1 << (row * 5 + col);
		}
		masks.push(mask);
	}
	for (let col = 0; col < 5; col++) {
		let mask = 0;
		for (let row = 0; row < 5; row++) {
			mask |= 1 << (row * 5 + col);
		}
		masks.push(mask);
	}
	let diagonal1 = 0;
	let diagonal2 = 0;
	for (let i = 0; i < 5; i++) {
		diagonal1 |= 1 << (i * 5 + i);
		diagonal2 |= 1 << (i * 5 + (4 - i));
	}
	masks.push(diagonal1);
	masks.push(diagonal2);

	return masks.map(mask => mask & ~(1 << FREE_CELL_INDEX));
}

/** 立っているビットの数を数える */
function popcount(value: number): number {
	let count = 0;
	let v = value;
	while (v !== 0) {
		v &= v - 1;
		count++;
	}
	return count;
}

/** 特定のk個の番号が、全TOTAL_NUMBERS個の中からのt回の抽選で全て引かれる確率 */
function probabilityAllDrawn(k: number, t: number): number {
	if (t < k) {
		return 0;
	}
	let probability = 1;
	for (let i = 0; i < k; i++) {
		probability *= (t - i) / (TOTAL_NUMBERS - i);
	}
	return probability;
}
