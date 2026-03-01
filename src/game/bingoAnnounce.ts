import type { AssetLoader } from "../assetLoader";

export class BingoAnnounce {
	private root: g.E;
	private label: g.Label;
	private bingoSound: g.AudioAsset;

	constructor(params: {
		scene: g.Scene;
		parent: g.E;
		x: number;
		y: number;
		width: number;
		height: number;
		font: g.Font;
		fontSize: number;
		assetLoader: AssetLoader;
	}) {
		this.bingoSound = params.assetLoader.getAudio("/audio/bingo");
		this.root = new g.E({
			scene: params.scene,
			parent: params.parent,
			x: params.x,
			y: params.y,
			width: params.width,
			height: params.height,
		});

		this.label = new g.Label({
			scene: params.scene,
			parent: this.root,
			x: this.root.width / 2,
			y: this.root.height / 2,
			width: params.width,
			height: params.height,
			font: params.font,
			text: "BINGO!",
			fontSize: params.fontSize,
			textAlign: "center",
			widthAutoAdjust: false,
			anchorX: 0.5,
			anchorY: 0.5,
		});
		this.label.hide();
	}

	public announce(): void {
		this.bingoSound.play();
		this.label.show();
		this.label.invalidate();
	}
}
