import type { Tween } from "@akashic-extension/akashic-timeline";
import { Easing, Timeline } from "@akashic-extension/akashic-timeline";
import { formatPercent, niceCeil } from "../utils/chartScale";
import type { BingoProbabilityTable } from "./bingoProbability";

/** パネル本体の横幅 */
const BODY_WIDTH = 460;
/** パネル本体の縦幅 */
const BODY_HEIGHT = 265;
/** タブの横幅 */
const TAB_WIDTH = 40;
/** タブの縦幅 */
const TAB_HEIGHT = 120;
/** プロット領域の左端（パネルローカル座標） */
const PLOT_X = 60;
/** プロット領域の横幅 */
const PLOT_WIDTH = 385;
/** プロット領域の縦幅 */
const PLOT_HEIGHT = 202;
/** プロット領域の上端 */
const PLOT_Y = 36;
/** 開閉スライドアニメーションの時間（ミリ秒） */
const SLIDE_DURATION_MS = 250;

/**
 * ビンゴ確率の統計グラフを表示するスライド式パネル。
 * 普段はビンゴシートの裏に隠れていて、右端にはみ出しているタブをクリックするとシートの右側へスライドして出てくる。
 * 閉じている間シートの裏に隠れるよう、シート背景より先にbackgroundレイヤーへ追加されることを前提としている（append順で重なりが決まるため）。
 */
export class StatisticsPanel {
	private root: g.E;
	private timeline: Timeline;
	private slideTween: Tween | null = null;
	private table: BingoProbabilityTable;
	private maxTurns: number;
	private closedX: number;
	private openX: number;
	private isOpen: boolean = false;
	private currentValueLabel: g.Label;
	private tabArrowLabel: g.Label;
	private turnMarker: g.FilledRect;
	private bingoMarker: g.FilledRect;
	private bingoLabel: g.Label;

	constructor(params: {
		scene: g.Scene;
		parent: g.E;
		font: g.Font;
		x: number;
		y: number;
		openX: number;
		maxTurns: number;
		table: BingoProbabilityTable;
	}) {
		this.table = params.table;
		this.maxTurns = params.maxTurns;
		this.closedX = params.x;
		this.openX = params.openX;
		this.timeline = new Timeline(params.scene);

		this.root = new g.E({
			scene: params.scene,
			parent: params.parent,
			x: params.x,
			y: params.y,
			width: BODY_WIDTH + TAB_WIDTH,
			height: BODY_HEIGHT,
		});

		// タブ（シートの右端からはみ出して見える部分）
		const tab = new g.FilledRect({
			scene: params.scene,
			parent: this.root,
			x: BODY_WIDTH,
			y: 10,
			width: TAB_WIDTH,
			height: TAB_HEIGHT,
			cssColor: "lightGreen",
			touchable: true,
		});

		const tabChars = ["統", "計"];
		for (let i = 0; i < tabChars.length; i++) {
			new g.Label({
				scene: params.scene,
				parent: tab,
				x: TAB_WIDTH / 2,
				y: 10 + i * 30,
				width: TAB_WIDTH,
				height: 30,
				font: params.font,
				text: tabChars[i],
				fontSize: 24,
				textColor: "black",
				textAlign: "center",
				widthAutoAdjust: false,
				anchorX: 0.5,
				touchable: false,
			});
		}

		this.tabArrowLabel = new g.Label({
			scene: params.scene,
			parent: tab,
			x: TAB_WIDTH / 2,
			y: 82,
			width: TAB_WIDTH,
			height: 24,
			font: params.font,
			text: "▶",
			fontSize: 16,
			textColor: "black",
			textAlign: "center",
			widthAutoAdjust: false,
			anchorX: 0.5,
			touchable: false,
		});

		tab.onPointDown.add(() => {
			this.toggle();
		});

		// パネル本体
		const body = new g.FilledRect({
			scene: params.scene,
			parent: this.root,
			x: 0,
			y: 0,
			width: BODY_WIDTH,
			height: BODY_HEIGHT,
			cssColor: "rgba(0, 0, 0, 0.5)",
		});

		this.currentValueLabel = new g.Label({
			scene: params.scene,
			parent: body,
			x: 12,
			y: 12,
			width: BODY_WIDTH - 24,
			height: 18,
			font: params.font,
			text: "抽選開始前",
			fontSize: 14,
			textColor: "white",
			textAlign: "right",
			widthAutoAdjust: false,
		});

		this.turnMarker = this.buildPlot({
			scene: params.scene,
			parent: body,
			font: params.font,
			series: this.table.cumulative,
			color: "green",
		});

		// 初ビンゴしたターンのマーカーと確率ラベル（ビンゴするまでは非表示）
		this.bingoMarker = new g.FilledRect({
			scene: params.scene,
			parent: body,
			x: PLOT_X,
			y: PLOT_Y,
			width: 2,
			height: PLOT_HEIGHT,
			cssColor: "red",
		});
		this.bingoMarker.hide();

		this.bingoLabel = new g.Label({
			scene: params.scene,
			parent: body,
			x: PLOT_X,
			y: PLOT_Y + 4,
			width: 80,
			height: 16,
			font: params.font,
			text: "",
			fontSize: 14,
			textColor: "red",
			widthAutoAdjust: false,
		});
		this.bingoLabel.hide();

		this.buildTurnAxisLabels(params.scene, body, params.font);
	}

	/** 現在のターン（完了した抽選回数）をグラフのマーカーと読み出しラベルに反映する */
	public setCurrentTurn(turn: number): void {
		const t = Math.min(turn, this.maxTurns);
		if (t < 1) {
			this.turnMarker.hide();
			return;
		}
		const markerX = PLOT_X + (t - 0.5) * (PLOT_WIDTH / this.maxTurns);
		this.turnMarker.x = markerX - this.turnMarker.width / 2;
		this.turnMarker.modified();
		this.turnMarker.show();
		this.currentValueLabel.text = `${t}ターン目　${formatPercent(this.table.cumulative[t], 1)}`;
		this.currentValueLabel.invalidate();
	}

	/** 初ビンゴしたターンをグラフに赤線で記録し、そのターンまでにビンゴできている確率を横に表示する */
	public setBingoTurn(turn: number): void {
		const t = Math.min(turn, this.maxTurns);
		if (t < 1) {
			return;
		}
		const markerX = PLOT_X + (t - 0.5) * (PLOT_WIDTH / this.maxTurns);
		this.bingoMarker.x = markerX - this.bingoMarker.width / 2;
		this.bingoMarker.modified();
		this.bingoMarker.show();

		// ラベルは赤線の右横に置き、右端で見切れる場合だけ左横に置く
		this.bingoLabel.text = formatPercent(this.table.cumulative[t], 1);
		if (markerX + 6 + this.bingoLabel.width <= PLOT_X + PLOT_WIDTH) {
			this.bingoLabel.x = markerX + 6;
			this.bingoLabel.textAlign = "left";
		} else {
			this.bingoLabel.x = markerX - 6 - this.bingoLabel.width;
			this.bingoLabel.textAlign = "right";
		}
		this.bingoLabel.invalidate();
		this.bingoLabel.show();
	}

	/** パネルの開閉を切り替える */
	public toggle(): void {
		this.isOpen = !this.isOpen;
		// アニメーション途中に連打されても、現在位置から目標位置へTweenを張り直すだけなので位置は破綻しない
		if (this.slideTween) {
			this.slideTween.cancel();
		}
		this.slideTween = this.timeline.create(this.root)
			.to({ x: this.isOpen ? this.openX : this.closedX }, SLIDE_DURATION_MS, Easing.easeInOutSine);
		this.tabArrowLabel.text = this.isOpen ? "◀" : "▶";
		this.tabArrowLabel.invalidate();
	}

	/** プロット1面（キャプション・軸ラベル・系列・現在ターンマーカー）を構築し、現在ターンマーカーを返す */
	private buildPlot(params: {
		scene: g.Scene;
		parent: g.E;
		font: g.Font;
		series: number[];
		color: string;
	}): g.FilledRect {
		const plotBackground = new g.FilledRect({
			scene: params.scene,
			parent: params.parent,
			x: PLOT_X,
			y: PLOT_Y,
			width: PLOT_WIDTH,
			height: PLOT_HEIGHT,
			cssColor: "white",
		});

		new g.FilledRect({
			scene: params.scene,
			parent: plotBackground,
			x: 0,
			y: PLOT_HEIGHT / 2,
			width: PLOT_WIDTH,
			height: 1,
			cssColor: "rgba(0, 0, 0, 0.15)",
		});

		// 縦軸の上限は系列の最大値から切りよく決める（0.0003%版のような極小値でも表示が潰れないように）
		const yMax = niceCeil(params.series.reduce((max, v) => Math.max(max, v), 0));

		new g.Label({
			scene: params.scene,
			parent: params.parent,
			x: 4,
			y: PLOT_Y,
			width: PLOT_X - 8,
			height: 14,
			font: params.font,
			text: formatPercent(yMax),
			fontSize: 12,
			textColor: "white",
			textAlign: "right",
			widthAutoAdjust: false,
		});

		new g.Label({
			scene: params.scene,
			parent: params.parent,
			x: 4,
			y: PLOT_Y + PLOT_HEIGHT - 12,
			width: PLOT_X - 8,
			height: 14,
			font: params.font,
			text: "0%",
			fontSize: 12,
			textColor: "white",
			textAlign: "right",
			widthAutoAdjust: false,
		});

		const slotWidth = PLOT_WIDTH / this.maxTurns;
		const xOf = (t: number): number => PLOT_X + (t - 0.5) * slotWidth;
		const yOf = (v: number): number => PLOT_Y + PLOT_HEIGHT - (v / yMax) * PLOT_HEIGHT;

		// 折れ線: 隣接するデータ点を細い矩形を回転させて繋ぎ、継ぎ目にはドットを重ねる
		for (let t = 1; t < this.maxTurns; t++) {
			const x1 = xOf(t);
			const y1 = yOf(params.series[t]);
			const dx = xOf(t + 1) - x1;
			const dy = yOf(params.series[t + 1]) - y1;
			new g.FilledRect({
				scene: params.scene,
				parent: params.parent,
				x: x1,
				y: y1,
				width: Math.sqrt(dx * dx + dy * dy),
				height: 2,
				anchorX: 0,
				anchorY: 0.5,
				angle: Math.atan2(dy, dx) * 180 / Math.PI, // Akashicのangleは度数法
				cssColor: params.color,
			});
		}
		for (let t = 1; t <= this.maxTurns; t++) {
			new g.FilledRect({
				scene: params.scene,
				parent: params.parent,
				x: xOf(t),
				y: yOf(params.series[t]),
				width: 4,
				height: 4,
				anchorX: 0.5,
				anchorY: 0.5,
				cssColor: params.color,
			});
		}

		// 現在ターンのマーカー（最初のターンが始まるまでは非表示）
		const marker = new g.FilledRect({
			scene: params.scene,
			parent: params.parent,
			x: PLOT_X,
			y: PLOT_Y,
			width: 2,
			height: PLOT_HEIGHT,
			cssColor: "black",
		});
		marker.hide();
		return marker;
	}

	/** 横軸（ターン数）の目盛りラベルを下段プロットの下に構築する */
	private buildTurnAxisLabels(scene: g.Scene, parent: g.E, font: g.Font): void {
		const slotWidth = PLOT_WIDTH / this.maxTurns;
		this.tickTurns().forEach(t => {
			new g.Label({
				scene: scene,
				parent: parent,
				x: PLOT_X + (t - 0.5) * slotWidth,
				y: PLOT_Y + PLOT_HEIGHT + 4,
				width: 40,
				height: 14,
				font: font,
				text: t.toString(),
				fontSize: 12,
				textColor: "white",
				textAlign: "center",
				widthAutoAdjust: false,
				anchorX: 0.5,
			});
		});
	}

	/** 目盛りを打つターン: 1・10の倍数・最終ターン。ただし最終ターンのラベルと重なりそうなものは除く */
	private tickTurns(): number[] {
		const ticks: number[] = [1];
		for (let t = 10; t < this.maxTurns; t += 10) {
			ticks.push(t);
		}
		if (this.maxTurns > 1) {
			ticks.push(this.maxTurns);
		}
		return ticks.filter((t, i) => i === ticks.length - 1 || ticks[i + 1] - t >= 3);
	}
}
