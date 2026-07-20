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
/** ビンゴ系列（曲線・マーカー・ラベル）の色 */
const BINGO_COLOR = "red";
/** リーチ系列の色（黄色系。白背景でも読めるよう暗めの黄色） */
const REACH_COLOR = "goldenrod";

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
	private reachMarker: g.FilledRect;
	private reachLabel: g.Label;
	private hasBingoMarker: boolean = false;
	private hasReachMarker: boolean = false;

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
			// リーチを先に描き、ビンゴの線が上に重なるようにする
			seriesList: [
				{ values: this.table.reachCumulative, color: REACH_COLOR },
				{ values: this.table.cumulative, color: BINGO_COLOR },
			],
		});

		// 初ビンゴ・初リーチしたターンのマーカーと確率ラベル（発生するまでは非表示）
		// ラベルはビンゴを上段・リーチを下段に分けて、互いに重ならないようにする
		this.bingoMarker = this.createEventMarker(params.scene, body, BINGO_COLOR);
		this.bingoLabel = this.createEventLabel(params.scene, body, params.font, BINGO_COLOR, PLOT_Y + 4);
		this.reachMarker = this.createEventMarker(params.scene, body, REACH_COLOR);
		this.reachLabel = this.createEventLabel(params.scene, body, params.font, REACH_COLOR, PLOT_Y + 24);

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
		this.currentValueLabel.text =
			`${t}ターン目　リーチ ${formatPercent(this.table.reachCumulative[t], 1)}　ビンゴ ${formatPercent(this.table.cumulative[t], 1)}`;
		this.currentValueLabel.invalidate();
	}

	/** 初ビンゴしたターンをグラフに縦線で記録し、そのターンまでの累積確率を横に表示する（2回目以降の呼び出しは無視する） */
	public setBingoTurn(turn: number): void {
		if (this.hasBingoMarker) {
			return;
		}
		this.hasBingoMarker = true;
		this.showEventMarker(this.bingoMarker, this.bingoLabel, turn, this.table.cumulative, false);
	}

	/** 初リーチしたターンをグラフに縦線で記録し、そのターンまでの累積確率を横に表示する（2回目以降の呼び出しは無視する） */
	public setReachTurn(turn: number): void {
		if (this.hasReachMarker) {
			return;
		}
		this.hasReachMarker = true;
		this.showEventMarker(this.reachMarker, this.reachLabel, turn, this.table.reachCumulative, true);
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

	/** イベント（初リーチ・初ビンゴ）用の縦線マーカーを生成する（非表示状態で返す） */
	private createEventMarker(scene: g.Scene, parent: g.E, color: string): g.FilledRect {
		const marker = new g.FilledRect({
			scene: scene,
			parent: parent,
			x: PLOT_X,
			y: PLOT_Y,
			width: 2,
			height: PLOT_HEIGHT,
			cssColor: color,
		});
		marker.hide();
		return marker;
	}

	/** イベント用の確率ラベルを生成する（非表示状態で返す） */
	private createEventLabel(scene: g.Scene, parent: g.E, font: g.Font, color: string, y: number): g.Label {
		const label = new g.Label({
			scene: scene,
			parent: parent,
			x: PLOT_X,
			y: y,
			width: 80,
			height: 16,
			font: font,
			text: "",
			fontSize: 14,
			textColor: color,
			widthAutoAdjust: false,
		});
		label.hide();
		return label;
	}

	/** イベントの縦線マーカーと確率ラベルを指定ターンの位置に表示する */
	private showEventMarker(marker: g.FilledRect, label: g.Label, turn: number, series: number[], preferLeft: boolean): void {
		const t = Math.min(turn, this.maxTurns);
		if (t < 1) {
			return;
		}
		const markerX = PLOT_X + (t - 0.5) * (PLOT_WIDTH / this.maxTurns);
		marker.x = markerX - marker.width / 2;
		marker.modified();
		marker.show();

		// ラベルはリーチを左優先・ビンゴを右優先にして互いに離し、プロットからはみ出す場合は反対側に回す
		label.text = formatPercent(series[t], 1);
		const fitsLeft = markerX - 6 - label.width >= PLOT_X;
		const fitsRight = markerX + 6 + label.width <= PLOT_X + PLOT_WIDTH;
		if (preferLeft ? fitsLeft : !fitsRight) {
			label.x = markerX - 6 - label.width;
			label.textAlign = "right";
		} else {
			label.x = markerX + 6;
			label.textAlign = "left";
		}
		label.invalidate();
		label.show();
	}

	/** プロット（軸ラベル・系列・現在ターンマーカー）を構築し、現在ターンマーカーを返す */
	private buildPlot(params: {
		scene: g.Scene;
		parent: g.E;
		font: g.Font;
		seriesList: Array<{ values: number[]; color: string }>;
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

		// 縦軸の上限は全系列の最大値から切りよく決める（0.0003%版のような極小値でも表示が潰れないように）
		const maxValue = params.seriesList.reduce(
			(max, series) => series.values.reduce((m, v) => Math.max(m, v), max), 0);
		const yMax = niceCeil(maxValue);

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
		params.seriesList.forEach(series => {
			for (let t = 1; t < this.maxTurns; t++) {
				const x1 = xOf(t);
				const y1 = yOf(series.values[t]);
				const dx = xOf(t + 1) - x1;
				const dy = yOf(series.values[t + 1]) - y1;
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
					cssColor: series.color,
				});
			}
			for (let t = 1; t <= this.maxTurns; t++) {
				new g.FilledRect({
					scene: params.scene,
					parent: params.parent,
					x: xOf(t),
					y: yOf(series.values[t]),
					width: 4,
					height: 4,
					anchorX: 0.5,
					anchorY: 0.5,
					cssColor: series.color,
				});
			}
		});

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
