import { Timeline } from "@akashic-extension/akashic-timeline";

export class LabeledValueBox {
	private root: g.E;
	private valueLabel: g.Label;
	private timeline: Timeline;
	private valueEffectLabel: g.Label;

	constructor(params: {
		scene: g.Scene;
		parent: g.E;
		x: number;
		y: number;
		font: g.Font;
		title: string;
	}) {
		this.root = new g.E({
			scene: params.scene,
			parent: params.parent,
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

		// タイトルラベル
		new g.Label({
			scene: params.scene,
			parent: background,
			x: 10,
			y: 5,
			width: 100,
			height: 40,
			font: params.font,
			text: params.title,
			fontSize: 32,
			textColor: "white",
			textAlign: "center",
			widthAutoAdjust: false,
		});

		// 値表示の背景
		const valueFieldRect = new g.FilledRect({
			scene: params.scene,
			parent: background,
			x: 10,
			y: 50,
			width: 100,
			height: 40,
			cssColor: "white",
		});

		// 値表示のラベル
		this.valueLabel = new g.Label({
			scene: params.scene,
			parent: valueFieldRect,
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

		this.valueEffectLabel = new g.Label({
			scene: params.scene,
			parent: this.valueLabel,
			x: 50,
			y: 15,
			width: 100,
			height: 30,
			font: params.font,
			anchorX: 0.5,
			anchorY: 0.5,
			text: "",
			fontSize: 24,
			opacity: 0,
			textAlign: "center",
			widthAutoAdjust: false,
		});

		this.timeline = new Timeline(params.scene);
	}

	public setValue(value: string): void {
		if (this.valueLabel.text === value) {
			return;
		}
		this.valueLabel.text = value;
		this.valueLabel.invalidate();

		this.timeline.create(this.valueEffectLabel)
			.call(() => {
				this.valueEffectLabel.text = value;
				this.valueEffectLabel.opacity = 0.5;
				this.valueEffectLabel.scaleX = 1;
				this.valueEffectLabel.scaleY = 1;
				this.valueEffectLabel.y = 15;
				this.valueEffectLabel.invalidate();
			})
			.to({
				scaleX: 4,
				scaleY: 4,
				y:0,
				opacity: 0,
			}, 200);
	}
}
