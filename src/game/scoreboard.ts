import type { AssetLoader } from "../assetLoader";
import type { Layers } from "../utils/layers";
import { MessageBox } from "./messagebox";

export class Scoreboard {
	private root: g.E;
	private scoreLabel: g.Label;
	private messageBox: MessageBox;

	constructor(params: {
		x: number;
		y: number;
		font: g.Font;
		scene: g.Scene;
		layers: Layers;
		assetLoader: AssetLoader;
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

		// "点数"のラベル
		new g.Label({
			scene: params.scene,
			parent: background,
			x: 10,
			y: 5,
			width: 100,
			height: 40,
			font: params.font,
			text: "点数",
			fontSize: 32,
			textColor: "white",
			textAlign: "center",
			widthAutoAdjust: false,
		});

		// 点数表示の背景
		const scoreFieldRect = new g.FilledRect({
			scene: params.scene,
			parent: background,
			x: 10,
			y: 50,
			width: 100,
			height: 40,
			cssColor: "white",
		});

		// 点数表示のラベル
		this.scoreLabel = new g.Label({
			scene: params.scene,
			parent: scoreFieldRect,
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

		// 点数の理由を表示するメッセージボックス
		this.messageBox = new MessageBox({
			scene: params.scene,
			parent: this.root,
			x: 120,
			y: 80,
			width: 200,
			height: 100,
			font: params.font,
			assetLoader: params.assetLoader,
		});
		this.messageBox.hide();
	}


	public setScore(score: number, reason: string): void {
		this.scoreLabel.text = score.toString();
		this.scoreLabel.invalidate();
		this.messageBox.setMessage(reason);
		this.messageBox.show();
	}
}
