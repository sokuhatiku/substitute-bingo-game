import { formatPercent, niceCeil } from "../src/utils/chartScale";

describe("niceCeil", () => {
	it("1・2・5系列に切り上げる", () => {
		expect(niceCeil(0.5)).toBeCloseTo(0.5, 15);
		expect(niceCeil(0.011)).toBeCloseTo(0.02, 15);
		expect(niceCeil(0.03)).toBeCloseTo(0.05, 15);
		expect(niceCeil(0.06)).toBeCloseTo(0.1, 15);
		expect(niceCeil(0.51)).toBeCloseTo(1, 15);
		expect(niceCeil(3.3e-6)).toBeCloseTo(5e-6, 15);
		expect(niceCeil(1)).toBe(1);
	});

	it("浮動小数点誤差でわずかに大きい値は繰り上げない", () => {
		expect(niceCeil(1 + 1e-12)).toBe(1);
		expect(niceCeil(0.5 * (1 + 1e-12))).toBeCloseTo(0.5, 15);
	});

	it("0以下は1を返す", () => {
		expect(niceCeil(0)).toBe(1);
		expect(niceCeil(-1)).toBe(1);
	});
});

describe("formatPercent", () => {
	it("値の桁数に応じた小数桁で整形し、指数表記を使わない", () => {
		expect(formatPercent(0.5)).toBe("50%");
		expect(formatPercent(0.02)).toBe("2%");
		expect(formatPercent(1)).toBe("100%");
		expect(formatPercent(0.005)).toBe("0.5%");
		expect(formatPercent(0.000005)).toBe("0.0005%");
		expect(formatPercent(0.000005)).not.toContain("e");
		expect(formatPercent(0)).toBe("0%");
	});

	it("追加の小数桁数を指定できる", () => {
		expect(formatPercent(0.085, 1)).toBe("8.5%");
		expect(formatPercent(0.5, 1)).toBe("50.0%");
	});
});
