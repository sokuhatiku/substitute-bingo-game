import * as al from "@akashic-extension/akashic-label";
import { Timeline } from "@akashic-extension/akashic-timeline";
import { allAssets, AssetLoader } from "./assetLoader";
import { BingoCell } from "./game/bingoCell";
import { NiconamaGameBridge } from "./niconamaGameBridge";
import type { GameMainParameterObject } from "./parameterObject";
import type { Layers } from "./utils/layers";

export function main(param: GameMainParameterObject): void {
	let applicationTimeLimit = Infinity;
	if (param.sessionParameter.totalTimeLimit) {
		applicationTimeLimit = param.sessionParameter.totalTimeLimit;
	}

	const niconama = new NiconamaGameBridge();
	const scene = new g.Scene({
		game: g.game,
		assetPaths: [...allAssets],
	});
	const assetLoader = new AssetLoader(scene);

	const font = new g.DynamicFont({
		game: g.game,
		fontFamily: "sans-serif",
		size: 15
	});

	scene.onLoad.add(() => {
		const layers: Layers = {
			background: createLayerEntity(scene),
			foreground: createLayerEntity(scene),
			paricles: createLayerEntity(scene),
			ui: createLayerEntity(scene),
			debugUi: createLayerEntity(scene),
		};

		// ビンゴシートが開く順番を決める配列（ゲーム全体で同じ順番になるよう、ゲームの乱数を使う）
		const openArray = generateBingoArray(g.game.random);
		// ユーザーシート生成用の配列（ローカルの乱数を使う）
		const userArray = generateBingoArray(g.game.localRandom);

		// この時点でスコアは決定するので、事前に計算してしまう
		const score = calculateScore(openArray, userArray);

		// ニコ生ゲームにあらかじめスコアを通知
		niconama.noticeScore(score);

		// 以降はビジュアル面の実装
		// ビンゴシートのセルを生成
		const cells: BingoCell[] = [];
		const reverseCells: Record<number, BingoCell> = {}; // 数字からセルを逆引きするマップ
		for (let i = 0; i < 5; i++) {
			for (let j = 0; j < 5; j++) {
				const number = userArray[i * 5 + j];
				const isCenter = (i === 2 && j === 2);
				const cell = new BingoCell({
					scene: scene,
					parent: layers.foreground,
					font: font,
					x: i * 60,
					y: j * 60,
					width: 60,
					height: 60,
					cssColor: "white",
					label: isCenter ? "FREE" : number.toString(),
				});

				cells.push(cell);
				if (isCenter) {
					cell.check(); // フリーマスは最初から開いている
				} else {
					reverseCells[number] = cell;
				}
			}
		}

		// 数値発表アニメーション
		const timeline = new Timeline(scene);
		const announcementLabel = new al.Label({
			scene: scene,
			parent: layers.ui,
			x: 320,
			y: 20,
			font: font,
			text: "",
			fontSize: 24,
			width: 200,
		});

		let turn = 0;
		timeline.create(announcementLabel, { loop: true })
			.call(() => {
				if (turn === openArray.length) {
					announcementLabel.text = "Game Over";
					announcementLabel.invalidate();
					return;
				} else if (turn > openArray.length) {
					return;
				}
				const next = openArray[turn];
				announcementLabel.text = `Next: ${next}\nTurn: ${turn + 1}`;
				announcementLabel.invalidate();
				if (next in reverseCells) {
					reverseCells[next].check();
				}
				turn++;
			})
			.wait(1000);

	});

	g.game.pushScene(scene);
}

function createLayerEntity(scene: g.Scene): g.E {
	const entity = new g.E({
		scene: scene,
		width: g.game.width,
		height: g.game.height,
		x: 0,
		y: 0,
		parent: scene,
	});
	return entity;
}

/**
 * 1から75までの数字をシャッフルして並べる
 * @returns シャッフルされた数字の配列（長さは75）
 */
function generateBingoArray(generator: g.RandomGenerator): number[] {
	const array: number[] = [];
	for (let i = 1; i <= 75; i++) {
		array.push(i);
	}

	// Fisher-Yatesシャッフル
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(generator.generate() * (i + 1));
		const tmp = array[i];
		array[i] = array[j];
		array[j] = tmp;
	}

	return array;
}

/**
 * 与えられたビンゴシートの開いた順番とユーザーのシートを比較してスコアを計算する
 * @param gameArray ビンゴシートが開く順番の配列
 * @param userArray ユーザーのビンゴシートの配列
 * @returns 計算されたスコア
 */
function calculateScore(gameArray: number[], userArray: number[]): number {
	// スコア計算方法：
	// gameArrayから値を取り出し、userArrayの該当マスを塗りつぶすことを1ターンとする
	// 最初にビンゴした時のターン数を取得する
	// ニコ生ゲームの仕様上、スコアが大きいほどランキング上位になるため、100からターン数を引いた値をスコアとする

	// userArrayの先頭25個がビンゴカード（index 12は中央のフリーマス）
	// 各数字がカード上のどの位置にあるかのマップを作る
	const numberToIndex: Record<number, number> = {};
	for (let i = 0; i < 25; i++) {
		if (i === 12) continue; // フリーマス
		numberToIndex[userArray[i]] = i;
	}

	// 5x5の開放状態（フリーマスは最初から開いている）
	const opened: boolean[] = [];
	for (let i = 0; i < 25; i++) {
		opened.push(i === 12);
	}

	// ビンゴ判定用のライン定義（行5本 + 列5本 + 対角線2本 = 12本）
	const lines: number[][] = [];
	for (let i = 0; i < 5; i++) {
		// 行
		lines.push([i * 5, i * 5 + 1, i * 5 + 2, i * 5 + 3, i * 5 + 4]);
		// 列
		lines.push([i, i + 5, i + 10, i + 15, i + 20]);
	}
	// 対角線
	lines.push([0, 6, 12, 18, 24]);
	lines.push([4, 8, 12, 16, 20]);

	for (let turn = 0; turn < gameArray.length; turn++) {
		const num = gameArray[turn];
		if (num in numberToIndex) {
			opened[numberToIndex[num]] = true;
		}

		// ビンゴ判定
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (opened[line[0]] && opened[line[1]] && opened[line[2]] && opened[line[3]] && opened[line[4]]) {
				// ビンゴには最低4ターン必要なので、4ターンでのビンゴを100点とする
				return 100 - (turn + 1 - 4);
			}
		}
	}

	// ビンゴしなかった場合（理論上起こらないはずだが安全のため）
	return 0;
}
