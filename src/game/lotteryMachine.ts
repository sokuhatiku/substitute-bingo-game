import * as al from "@akashic-extension/akashic-label";
import { Timeline } from "@akashic-extension/akashic-timeline";
import type { AssetLoader } from "../assetLoader";

export class LotteryMachine {

	private root: g.E;
	private label: al.Label;
	private lotteryAnimation: Timeline;
	private rouletteSound: g.AudioAsset;

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
		this.rouletteSound = params.assetLoader.getAudio("/audio/roulette");
		this.rouletteSound.loop = true;

		this.root = new g.E({
			scene: params.scene,
			parent: params.parent,
			x: params.x,
			y: params.y,
			width: params.width,
			height: params.height,
		});

		const body = new g.FilledRect({
			scene: params.scene,
			parent: this.root,
			x: 0,
			y: 0,
			width: params.width,
			height: params.height,
			cssColor: "white",
		});

		this.label = new al.Label({
			scene: params.scene,
			parent: body,
			x: 0,
			y: 0,
			width: params.width,
			height: params.height,
			font: params.font,
			text: "",
			fontSize: 42,
			textAlign: "center",
			widthAutoAdjust: false,
		});

		this.lotteryAnimation = new Timeline(params.scene);
	}

	public announce(number: number, delay: number): void {
		this.lotteryAnimation.cancelAll();

		this.label.text = number.toString();
		this.label.invalidate();

		// 数値をランダムに表示し、最後に当選番号を表示するアニメーション
		const rouletteSoundPlay = this.rouletteSound.play();
		rouletteSoundPlay.changeVolume(0.5);

		const randomAnimation = this.lotteryAnimation.create(this.label, { loop: true })
			.call(() => {
				this.label.text = (Math.floor(g.game.localRandom.generate() * 75) + 1).toString();
				this.label.invalidate();
			});

		this.lotteryAnimation.create(this.label)
			.wait(delay)
			.call(() => {
				this.rouletteSound.stop();
				randomAnimation.cancel();

				this.label.text = number.toString();
				this.rouletteSound.stop();
				this.label.invalidate();
			});

	}
}
