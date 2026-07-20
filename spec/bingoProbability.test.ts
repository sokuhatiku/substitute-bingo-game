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
		}
	});
});
