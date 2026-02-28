export class BingoCell {

	private root: g.E;
	private background: g.FilledRect;
	private label: g.Label;

	private isChecked: boolean = false;

	public get checked(): boolean {
		return this.isChecked;
	}

	public constructor(params: {
		scene: g.Scene;
		parent: g.E;
		font: g.Font;
		x: number;
		y: number;
		width: number;
		height: number;
		cssColor: string;
		label: string;
	}) {
		this.root = new g.E({
			scene: params.scene,
			parent: params.parent,
			x: params.x,
			y: params.y,
			width: params.width,
			height: params.height,
		});

		this.background = new g.FilledRect({
			scene: params.scene,
			parent: this.root,
			x: 0,
			y: 0,
			width: params.width,
			height: params.height,
			cssColor: params.cssColor,
		});

		this.label = new g.Label({
			scene: params.scene,
			parent: this.root,
			x: 0,
			y: 0,
			width: params.width,
			height: params.height,
			font: params.font,
			text: params.label,
			fontSize: 24,
			textAlign: "center",
			widthAutoAdjust: false,
		});
	}

	public check(): void {
		this.isChecked = true;
		this.background.cssColor = "blue";
		this.background.modified();
		this.label.textColor = "white";
		this.label.invalidate();
	}
}
