import { LabeledValueBox } from "../uiElements/labeledValueBox";
import type { Layers } from "../utils/layers";

export class RemainTurnSign {
	private valueBox: LabeledValueBox;

	constructor(params: {
		x: number;
		y: number;
		font: g.Font;
		scene: g.Scene;
		layers: Layers;
	}) {
		this.valueBox = new LabeledValueBox({
			scene: params.scene,
			parent: params.layers.ui,
			x: params.x,
			y: params.y,
			font: params.font,
			title: "残り",
		});
	}

	public setRemainTurn(turn: number): void {
		this.valueBox.setValue(turn.toString());
	}

	public setFinished(): void {
		this.valueBox.setValue("終了");
	}
}
