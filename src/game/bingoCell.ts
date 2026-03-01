import { Timeline } from "@akashic-extension/akashic-timeline";
import type { AssetLoader } from "../assetLoader";

export class BingoCell {

	private root: g.E;
	private background: g.FilledRect;
	private label: g.Label;
	private reachEffect: g.FilledRect;
	private checkedColor: string;
	private checkSound: g.AudioAsset;

	private isChecked: boolean = false;
	private isReach: boolean = false;
	private isBingo: boolean = false;

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
		defaultColor: string;
		checkedColor: string;
		label: string;
		assetLoader: AssetLoader;
	}) {
		this.checkedColor = params.checkedColor;
		this.checkSound = params.assetLoader.getAudio("/audio/check");

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
			x: 2,
			y: 2,
			width: params.width - 4,
			height: params.height - 4,
			cssColor: params.defaultColor,
		});

		this.reachEffect = new g.FilledRect({
			scene: params.scene,
			parent: this.background,
			x: 0,
			y: 0,
			width: this.background.width,
			height: this.background.height,
			cssColor: "yellow",
			opacity: 0.5,
		});
		const timeline = new Timeline(params.scene);
		timeline.create(this.reachEffect, { loop: true })
			.fadeIn(500)
			.fadeOut(500);
		this.reachEffect.hide();

		this.label = new g.Label({
			scene: params.scene,
			parent: this.root,
			x: this.root.width / 2,
			y: this.root.height / 2,
			width: params.width,
			height: params.height,
			font: params.font,
			text: params.label,
			fontSize: 24,
			textAlign: "center",
			widthAutoAdjust: false,
			anchorX: 0.5,
			anchorY: 0.5,
		});
	}

	public check(): void {
		this.checkSound.play();
		this.isChecked = true;
		this.background.cssColor = this.checkedColor;
		this.background.modified();
		this.label.textColor = "white";
		this.label.invalidate();
	}

	public markAsReach(): void {
		if (this.isChecked || this.isReach || this.isBingo) return; // チェック済みのセルはリーチ表示しない
		this.reachEffect.show();
		this.isReach = true;
	}

	public markAsBingo(): void {
		if (this.isBingo) return; // すでにビンゴのセルは再度ビンゴ表示しない
		this.reachEffect.hide();
		this.background.cssColor = "red";
		this.background.modified();
		this.isBingo = true;
	}
}
