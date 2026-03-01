import { Timeline } from "@akashic-extension/akashic-timeline";

export class JoinButton {
	private root: g.E;
	private onClickTrigger: g.Trigger<void> = new g.Trigger<void>();

	public get onClick(): g.Trigger<void> {
		return this.onClickTrigger;
	}

	constructor(params: {
		scene: g.Scene;
		parent: g.E;
		x: number;
		y: number;
		width: number;
		height: number;
		font: g.Font;
	}) {
		this.root = new g.E({
			scene: params.scene,
			parent: params.parent,
			x: params.x,
			y: params.y,
			width: params.width,
			height: params.height,
		});

		const button = new g.FilledRect({
			scene: params.scene,
			parent: this.root,
			x: 0,
			y: 0,
			width: params.width,
			height: params.height,
			cssColor: "#0066FF",
			touchable: true,
		});

		const animationBox = new g.FilledRect({
			scene: params.scene,
			parent: button,
			x: button.width / 2,
			y: button.height / 2,
			width: button.width,
			height: button.height,
			cssColor: "#0066FF",
			opacity: 0.5,
			anchorX: 0.5,
			anchorY: 0.5,
			touchable: false,
		});
		const timeline = new Timeline(params.scene);
		timeline.create(animationBox, { loop: true })
			.to({ opacity: 1, scaleX: 1, scaleY: 1 }, 0)
			.to({ opacity: 0, scaleX: 1.1, scaleY: 1.1 }, 500);

		const label = new g.Label({
			scene: params.scene,
			parent: button,
			x: params.width / 2,
			y: params.height / 2 - 40,
			width: params.width,
			height: params.height,
			font: params.font,
			text: "ビンゴゲームに参加する",
			fontSize: 40,
			textColor: "white",
			textAlign: "center",
			widthAutoAdjust: false,
			anchorX: 0.5,
			anchorY: 0.5,
			touchable: false,
		});
		label.invalidate();

		const remarksLabel = new g.Label({
			scene: params.scene,
			parent: button,
			x: params.width / 2,
			y: params.height / 2 + 40,
			width: params.width,
			height: params.height,
			font: params.font,
			text: "（参加しない限り、ランキングには登録されません。）",
			fontSize: 16,
			textColor: "white",
			textAlign: "center",
			widthAutoAdjust: false,
			anchorX: 0.5,
			anchorY: 0.5,
			touchable: false,
		});
		remarksLabel.invalidate();

		button.onPointDown.add(() => {
			this.onClickTrigger.fire();

		});
	}

	public hide(): void {
		this.root.hide();
	}

	public show(): void {
		this.root.show();
	}
}
