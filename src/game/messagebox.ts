import { Easing, Timeline } from "@akashic-extension/akashic-timeline";
import type { AssetLoader } from "../assetLoader";

export class MessageBox {
	root: g.E;
	srcSurface: g.Surface;
	destSurface: g.Surface;
	sprite: g.Sprite;
	font: g.Font;
	label: g.Label;
	height: number;

	ninepatchRect: g.CommonRect = {
		left: 45,
		top: 45,
		right: 45,
		bottom: 45,
	};
	imageAssetName: "/image/message_box.png" = "/image/message_box.png";

	constructor(params: {
		scene: g.Scene;
		parent: g.E;
		x: number;
		y: number;
		width: number;
		height: number;
		font: g.Font;
		assetLoader: AssetLoader;
	}) {
		this.font = params.font;
		this.height = params.height;

		this.root = new g.E({
			scene: params.scene,
			parent: params.parent,
			x: params.x,
			y: params.y,
			anchorX: 0,
			anchorY: 1,
			width: params.width,
			height: params.height,
		});

		const messageBoxImage = params.assetLoader.getImage(this.imageAssetName);
		this.srcSurface = g.SurfaceUtil.asSurface(messageBoxImage)!;
		this.destSurface = params.scene.game.resourceFactory.createSurface(params.width, params.height);

		g.SurfaceUtil.drawNinePatch(this.destSurface, this.srcSurface, this.ninepatchRect);

		this.sprite = new g.Sprite({
			scene: params.scene,
			parent: this.root,
			x: 0,
			y: 0,
			width: params.width,
			height: params.height,
			src: this.destSurface,
		});

		this.label = new g.Label({
			scene: params.scene,
			parent: this.root,
			x: 35,
			y: 35,
			width: params.width - 70,
			height: params.height - 70,
			font: params.font,
			text: "",
			fontSize: 24,
			textAlign: "center",
			widthAutoAdjust: false,
		});

		const timeline = new Timeline(params.scene);
		timeline.create(this.root, { loop: true })
			.scaleTo(1.05, 1.05, 500, Easing.easeInOutSine)
			.scaleTo(1, 1, 500, Easing.easeInOutSine);
	}

	public hide(): void {
		this.sprite.hide();
	}
	public show(): void {
		this.sprite.show();
	}

	public setMessage(message: string): void {
		const size = this.font.measureText(message);
		// フォントサイズに合わせて横幅を調整
		const scaledWidth = (this.label.fontSize / this.font.size) * size.width;
		this.resizeBox(scaledWidth + 70, this.height);
		this.label.text = message;
		this.label.width = scaledWidth;
		this.label.height = this.height - 70;
		this.label.invalidate();
	}

	private resizeBox(width: number, height: number): void {
		this.destSurface.destroy();
		this.destSurface = this.root.scene.game.resourceFactory.createSurface(width, height);
		g.SurfaceUtil.drawNinePatch(this.destSurface, this.srcSurface, this.ninepatchRect);
		this.sprite.src = this.destSurface;
		this.sprite.srcWidth = width;
		this.sprite.srcHeight = height;
		this.sprite.width = width;
		this.sprite.height = height;
		this.sprite.invalidate();
	}
}
