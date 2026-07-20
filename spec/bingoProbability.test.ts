import { calculateBingoProbabilityTable } from "../src/game/bingoProbability";

describe("calculateBingoProbabilityTable", () => {
	const table = calculateBingoProbabilityTable(75);

	it("3ターン目まではビンゴできない", () => {
		expect(table.cumulative.slice(0, 4)).toEqual([0, 0, 0, 0]);
	});

	it("4ターン目の累積確率は 4/C(75,4) と一致する", () => {
		// 最速の4ターンビンゴは中央FREEを通る4ライン（中央行・中央列・対角2本）のどれかの残り4マスが全て引かれる場合のみ。
		// C(75,4) = 1215450
		const expected = 4 / 1215450;
		expect(Math.abs(table.cumulative[4] - expected) / expected).toBeLessThan(1e-9);
	});

	it("75ターン目の累積確率は1（確定ビンゴ）", () => {
		expect(table.cumulative[75]).toBeCloseTo(1, 12);
	});

	it("累積確率は単調非減少かつ1を超えない", () => {
		for (let t = 1; t <= 75; t++) {
			expect(table.cumulative[t]).toBeGreaterThanOrEqual(table.cumulative[t - 1] - 1e-12);
			expect(table.cumulative[t]).toBeLessThanOrEqual(1);
		}
	});

	it("71ターン目でビンゴが確定する（5行すべてを4個以下の未抽選番号では塞げないため）", () => {
		expect(table.cumulative[71]).toBe(1);
	});

	it("周辺確率は累積確率の差分", () => {
		for (let t = 1; t <= 75; t++) {
			expect(table.marginal[t]).toBeCloseTo(table.cumulative[t] - table.cumulative[t - 1], 12);
		}
	});

	it("周辺確率の総和は1", () => {
		const sum = table.marginal.reduce((acc, v) => acc + v, 0);
		expect(sum).toBeCloseTo(1, 9);
	});

	it("42ターン時点の累積確率は約50%（config.tsの記載と整合）", () => {
		expect(Math.abs(table.cumulative[42] - 0.5)).toBeLessThan(0.05);
	});

	it("maxTurnが小さいテーブルは75ターン版の先頭部分と一致する", () => {
		const table4 = calculateBingoProbabilityTable(4);
		expect(table4.cumulative.length).toBe(5);
		for (let t = 0; t <= 4; t++) {
			expect(table4.cumulative[t]).toBeCloseTo(table.cumulative[t], 15);
			expect(table4.marginal[t]).toBeCloseTo(table.marginal[t], 15);
			expect(table4.reachCumulative[t]).toBeCloseTo(table.reachCumulative[t], 15);
		}
	});

	describe("リーチ累積確率", () => {
		it("2ターン目まではリーチできない", () => {
			expect(table.reachCumulative.slice(0, 3)).toEqual([0, 0, 0]);
		});

		it("3ターン目のリーチ累積確率は 16/C(75,3) と一致する", () => {
			// 3ターンでリーチするのは、中央FREEを通る4ライン（残り4マス）のうち3マスが引かれる場合のみ。
			// 4ライン × C(4,3) = 16通り、C(75,3) = 67525
			const expected = 16 / 67525;
			expect(Math.abs(table.reachCumulative[3] - expected) / expected).toBeLessThan(1e-9);
		});

		it("4ターン目のリーチ累積確率が総当たり計算と一致する", () => {
			// DPとは独立の実装（全3マス・4マス集合の列挙）で照合する
			const masks = buildLineMasksForTest();
			const cells: number[] = [];
			for (let i = 0; i < 25; i++) {
				if (i !== 12) cells.push(i);
			}
			let reach3 = 0;
			let reach4 = 0;
			for (let a = 0; a < cells.length; a++) {
				for (let b = a + 1; b < cells.length; b++) {
					for (let c = b + 1; c < cells.length; c++) {
						const m3 = (1 << cells[a]) | (1 << cells[b]) | (1 << cells[c]);
						if (isReachForTest(m3, masks)) reach3++;
						for (let d = c + 1; d < cells.length; d++) {
							if (isReachForTest(m3 | (1 << cells[d]), masks)) reach4++;
						}
					}
				}
			}
			// シートの開きマスがちょうど3個（残り1回は非シート番号51個から）+ ちょうど4個
			const expected = (reach3 * 51 + reach4) / 1215450; // C(75,4)
			expect(Math.abs(table.reachCumulative[4] - expected) / expected).toBeLessThan(1e-9);
		});

		it("リーチ累積はビンゴ累積以上・単調非減少・1以下", () => {
			for (let t = 1; t <= 75; t++) {
				expect(table.reachCumulative[t]).toBeGreaterThanOrEqual(table.cumulative[t] - 1e-12);
				expect(table.reachCumulative[t]).toBeGreaterThanOrEqual(table.reachCumulative[t - 1] - 1e-12);
				expect(table.reachCumulative[t]).toBeLessThanOrEqual(1);
			}
		});

		it("66ターン目でリーチが確定する（リーチ無しでいられる開きマスは最大14個のため）", () => {
			expect(table.reachCumulative[66]).toBeCloseTo(1, 12);
		});
	});
});

/** テスト用に12ライン（行5・列5・対角2、中央FREE除外）の25bitマスクを構築する（実装とは独立の検算用） */
function buildLineMasksForTest(): number[] {
	const masks: number[] = [];
	for (let row = 0; row < 5; row++) {
		let m = 0;
		for (let col = 0; col < 5; col++) m |= 1 << (row * 5 + col);
		masks.push(m);
	}
	for (let col = 0; col < 5; col++) {
		let m = 0;
		for (let row = 0; row < 5; row++) m |= 1 << (row * 5 + col);
		masks.push(m);
	}
	let d1 = 0;
	let d2 = 0;
	for (let i = 0; i < 5; i++) {
		d1 |= 1 << (i * 5 + i);
		d2 |= 1 << (i * 5 + (4 - i));
	}
	masks.push(d1, d2);
	return masks.map(m => m & ~(1 << 12));
}

/** 開きマス集合がリーチ以上（いずれかのラインで残り1マス以下）かを判定する */
function isReachForTest(open: number, masks: number[]): boolean {
	return masks.some(mask => popcountForTest(open & mask) >= popcountForTest(mask) - 1);
}

function popcountForTest(value: number): number {
	let count = 0;
	let v = value;
	while (v !== 0) {
		v &= v - 1;
		count++;
	}
	return count;
}
