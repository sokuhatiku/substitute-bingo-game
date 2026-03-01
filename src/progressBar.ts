export class ProgressBar {
	private root: g.E;
	private rect: g.FilledRect;

	constructor(params: {
		scene: g.Scene;
		parent: g.E;
		x: number;
		y: number;
		width: number;
		height: number;
		cssColor: string;
	}) {
		this.root = new g.E({
			scene: params.scene,
			parent: params.parent,
			x: params.x,
			y: params.y,
			width: params.width,
			height: params.height,
		});

		this.rect = new g.FilledRect({
			scene: params.scene,
			parent: this.root,
			x: 0,
			y: 0,
			width: 0,
			height: params.height,
			cssColor: params.cssColor,
		});
	}

	public setProgress(progress: number): void {
		this.rect.width = this.root.width * progress;
		this.rect.modified();
	}
}
