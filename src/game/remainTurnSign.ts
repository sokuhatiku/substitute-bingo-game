import type { Layers } from "../utils/layers";

export class RemainTurnSign {
	private root: g.E;
	private turnLabel: g.Label;

	constructor(params: {
		x: number;
		y: number;
		font: g.Font;
		scene: g.Scene;
		layers: Layers;
	}) {
		this.root = new g.E({
			scene: params.scene,
			parent: params.layers.ui,
			x: params.x,
			y: params.y,
		});

		// 背景
		const background = new g.FilledRect({
			scene: params.scene,
			parent: this.root,
			x: 0,
			y: 0,
			width: 120,
			height: 100,
			cssColor: "rgba(0, 0, 0, 0.5)",
		});

		// "残りターン"のラベル
		new g.Label({
			scene: params.scene,
			parent: background,
			x: 10,
			y: 5,
			width: 100,
			height: 40,
			font: params.font,
			text: "残り",
			fontSize: 32,
			textColor: "white",
			textAlign: "center",
			widthAutoAdjust: false,
		});

		// ターン数表示の背景
		const turnFieldRect = new g.FilledRect({
			scene: params.scene,
			parent: background,
			x: 10,
			y: 50,
			width: 100,
			height: 40,
			cssColor: "white",
		});

		// ターン数表示のラベル
		this.turnLabel = new g.Label({
			scene: params.scene,
			parent: turnFieldRect,
			x: 0,
			y: 5,
			width: 100,
			height: 30,
			font: params.font,
			text: "0",
			fontSize: 24,
			textAlign: "center",
			widthAutoAdjust: false,
		});
	}

	public setRemainTurn(turn: number): void {
		this.turnLabel.text = turn.toString();
		this.turnLabel.invalidate();
	}
}
