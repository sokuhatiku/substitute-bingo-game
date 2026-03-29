import type { AssetLoader } from "../assetLoader";
import { LabeledValueBox } from "../uiElements/labeledValueBox";
import { MessageBox } from "../uiElements/messagebox";
import type { Layers } from "../utils/layers";

export class Scoreboard {
	private root: g.E;
	private valueBox: LabeledValueBox;
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

		this.valueBox = new LabeledValueBox({
			scene: params.scene,
			parent: this.root,
			x: 0,
			y: 0,
			font: params.font,
			title: "点数",
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
		this.valueBox.setValue(score.toString());
		this.messageBox.setMessage(reason);
		this.messageBox.show();
	}
}
