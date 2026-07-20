/** ビンゴで使う番号の総数（1〜75） */
const TOTAL_NUMBERS = 75;
/** 5x5シート中央（FREEマス）のビットインデックス */
const FREE_CELL_INDEX = 12;
/** シート上の抽選対象マスの数（中央FREEを除く24マス） */
const SHEET_CELL_COUNT = 24;

/**
 * ビンゴの理論確率テーブル。
 * 添字は完了した抽選ターン数（[0]は抽選開始前）。
 */
export interface BingoProbabilityTable {
	/** cumulative[t] = tターン目までにビンゴが成立している確率（[0] = 0） */
	cumulative: number[];
	/** marginal[t] = ちょうどtターン目で初めてビンゴが成立する確率（= cumulative[t] - cumulative[t-1]） */
	marginal: number[];
	/** reachCumulative[t] = tターン目までにリーチ以上（いずれかのラインが残り1マス、またはビンゴ済み）に到達している確率（[0] = 0） */
	reachCumulative: number[];
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

	return { cumulative, marginal, reachCumulative: calculateReachCumulative(maxTurn) };
}

/**
 * リーチ確率の累積テーブルを厳密に計算する。
 * ビンゴの包除原理は「ライン全マスが開く」事象にしか使えないため、こちらは
 * 「どのラインもリーチに達していない開きマス集合」をサイズ別に数え上げ（countNoReachSubsets）、
 * その補集合（=リーチ以上の集合）の個数に超幾何分布の確率を掛けて合算する。
 * 引き算は整数（集合の個数）の段階で行うので、1に近い値同士の浮動小数点減算による桁落ちは起きない。
 */
function calculateReachCumulative(maxTurn: number): number[] {
	const noReachBySize = countNoReachSubsets();
	const binomial = binomialRow(SHEET_CELL_COUNT);

	const result: number[] = [0];
	for (let t = 1; t <= maxTurn; t++) {
		let probability = 0;
		for (let u = 0; u <= SHEET_CELL_COUNT; u++) {
			const noReachCount = u < noReachBySize.length ? noReachBySize[u] : 0;
			const reachCount = binomial[u] - noReachCount;
			if (reachCount > 0) {
				probability += reachCount * exactSheetSubsetProbability(u, t);
			}
		}
		result.push(Math.min(1, Math.max(0, probability)));
	}
	return result;
}

/**
 * 「どのラインもリーチに達していない」開きマス集合の個数を、集合サイズごとに数え上げる。
 * シートを1行ずつ処理する動的計画法で、状態は各列と対角2本の開きマス数。
 * リーチに達しない開きマス数の上限は、通常ライン（5マス）で3、中央FREEを通るライン（実質4マス）で2。
 */
function countNoReachSubsets(): number[] {
	const colLimits = [3, 3, 2, 3, 3];
	const diagLimit = 2;
	const stateCount = 1 << 14; // 列カウント2bit×5 + 対角ペア(d1+3*d2: 0..8)4bit
	const maxSize = 14; // 全ラインの上限を同時に満たす開きマス数の最大値（行上限の合計 3+3+2+3+3）

	let states: Array<number[] | null> = createNullArray(stateCount);
	const initial: number[] = [];
	for (let u = 0; u <= maxSize; u++) {
		initial.push(u === 0 ? 1 : 0);
	}
	states[0] = initial;

	for (let row = 0; row < 5; row++) {
		const options = buildRowOptions(row);
		const next: Array<number[] | null> = createNullArray(stateCount);
		for (let state = 0; state < stateCount; state++) {
			const counts = states[state];
			if (!counts) continue;
			for (let i = 0; i < options.length; i++) {
				const optionCols = options[i];
				const newState = applyRowOption(state, row, optionCols, colLimits, diagLimit);
				if (newState < 0) continue;
				let target = next[newState];
				if (!target) {
					target = [];
					for (let u = 0; u <= maxSize; u++) {
						target.push(0);
					}
					next[newState] = target;
				}
				for (let u = 0; u + optionCols.length <= maxSize; u++) {
					if (counts[u] !== 0) {
						target[u + optionCols.length] += counts[u];
					}
				}
			}
		}
		states = next;
	}

	const totals: number[] = [];
	for (let u = 0; u <= maxSize; u++) {
		totals.push(0);
	}
	for (let state = 0; state < stateCount; state++) {
		const counts = states[state];
		if (!counts) continue;
		for (let u = 0; u <= maxSize; u++) {
			totals[u] += counts[u];
		}
	}
	return totals;
}

/** 全要素nullの配列を作る（実行環境がES5のためArray.fillは使えない） */
function createNullArray(length: number): Array<number[] | null> {
	const array: Array<number[] | null> = [];
	for (let i = 0; i < length; i++) {
		array.push(null);
	}
	return array;
}

/**
 * 1行分の開きマスの選び方（列インデックスの組）を列挙する。
 * 行ライン自体がリーチに達しないよう、開きマス数は通常行で3以下・中央行（FREEを除く4マス）で2以下に制限する。
 */
function buildRowOptions(row: number): number[][] {
	const availableCols = row === 2 ? [0, 1, 3, 4] : [0, 1, 2, 3, 4];
	const limit = row === 2 ? 2 : 3;
	const options: number[][] = [];
	for (let mask = 0; mask < (1 << availableCols.length); mask++) {
		if (popcount(mask) > limit) continue;
		const cols: number[] = [];
		for (let i = 0; i < availableCols.length; i++) {
			if ((mask & (1 << i)) !== 0) {
				cols.push(availableCols[i]);
			}
		}
		options.push(cols);
	}
	return options;
}

/**
 * DP状態（各列と対角2本の開きマス数）に1行分の開きマスを適用した新しい状態を返す。
 * 列または対角の上限を超える場合は-1（枝刈り）。
 */
function applyRowOption(state: number, row: number, optionCols: number[], colLimits: number[], diagLimit: number): number {
	const cols = [state & 3, (state >> 2) & 3, (state >> 4) & 3, (state >> 6) & 3, (state >> 8) & 3];
	const diagPair = state >> 10;
	let d1 = diagPair % 3;
	let d2 = Math.floor(diagPair / 3);
	for (let i = 0; i < optionCols.length; i++) {
		const col = optionCols[i];
		cols[col]++;
		if (cols[col] > colLimits[col]) return -1;
		if (col === row) d1++; // 主対角線のマス(row, row)
		if (col === 4 - row) d2++; // 反対角線のマス(row, 4-row)
	}
	if (d1 > diagLimit || d2 > diagLimit) return -1;
	return cols[0] | (cols[1] << 2) | (cols[2] << 4) | (cols[3] << 6) | (cols[4] << 8) | ((d1 + 3 * d2) << 10);
}

/** 二項係数C(n, 0..n)を並べた配列を返す（パスカルの三角形、整数のまま厳密） */
function binomialRow(n: number): number[] {
	let row = [1];
	for (let i = 1; i <= n; i++) {
		const next = [1];
		for (let k = 1; k < i; k++) {
			next.push(row[k - 1] + row[k]);
		}
		next.push(1);
		row = next;
	}
	return row;
}

/**
 * t回の抽選で、シート上の開きマスが「特定のu個ちょうど」になる確率。
 * = C(75-24, t-u) / C(75, t) を、巨大な階乗を経由しない積の形で計算する。
 */
function exactSheetSubsetProbability(u: number, t: number): number {
	if (t < u || t - u > TOTAL_NUMBERS - SHEET_CELL_COUNT) {
		return 0;
	}
	let probability = 1;
	for (let i = 0; i < u; i++) {
		probability *= t - i;
	}
	for (let j = 0; j < SHEET_CELL_COUNT - u; j++) {
		probability *= TOTAL_NUMBERS - t - j;
	}
	for (let k = 0; k < SHEET_CELL_COUNT; k++) {
		probability /= TOTAL_NUMBERS - k;
	}
	return probability;
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
