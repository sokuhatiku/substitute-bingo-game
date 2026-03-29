import type { Tween } from "@akashic-extension/akashic-timeline";
import { Timeline } from "@akashic-extension/akashic-timeline";
import { allAssets, AssetLoader } from "./assetLoader";
import { BingoAnnounce } from "./game/bingoAnnounce";
import { BingoCell } from "./game/bingoCell";
import { JoinButton } from "./game/joinButton";
import { LotteryMachine } from "./game/lotteryMachine";
import { RemainTurnSign } from "./game/remainTurnSign";
import { Scoreboard } from "./game/scoreboard";
import { NiconamaGameBridge } from "./niconamaGameBridge";
import type { GameMainParameterObject } from "./parameterObject";
import { ProgressBar } from "./progressBar";
import type { Layers } from "./utils/layers";

export function main(param: GameMainParameterObject): void {
	// ゲーム全体の時間制限（ミリ秒）。ニコ生ゲームのセッションパラメータから取得する。制限がない場合はInfinityになる。
	// totalTimeLimitは秒数で与えられるので*1000してミリ秒に変換する
	const applicationTimeLimitMs = param.sessionParameter.totalTimeLimit ? param.sessionParameter.totalTimeLimit * 1000 : Infinity;

	const niconama = new NiconamaGameBridge();
	const scene = new g.Scene({
		game: g.game,
		assetPaths: [...allAssets],
	});
	const assetLoader = new AssetLoader(scene);

	const font = new g.DynamicFont({
		game: g.game,
		fontFamily: "sans-serif",
		size: 32
	});

	scene.onLoad.add(() => {
		const layers: Layers = {
			background: createLayerEntity(scene),
			foreground: createLayerEntity(scene),
			particles: createLayerEntity(scene),
			ui: createLayerEntity(scene),
			important: createLayerEntity(scene),
			debugUi: createLayerEntity(scene),
		};

		// ビンゴシートが開く順番を決める配列（ゲーム全体で同じ順番になるよう、ゲームの乱数を使う）
		const openArray = generateBingoArray(param.random ?? g.game.random);
		// ユーザーシート生成用の配列（ローカルの乱数を使う）
		const userArray = generateBingoSheetArray(g.game.localRandom);

		// 画面下に表示される進行状況バー
		const progressBar = new ProgressBar({
			scene: scene,
			parent: layers.ui,
			x: 0,
			y: g.game.height - 20,
			width: g.game.width,
			height: 20,
			cssColor: "red",
		});
		let elapsedFrames = 0;
		scene.onUpdate.add(() => {
			elapsedFrames++;
			const elapsedTimeMs = elapsedFrames * 1000 / 30.0; // フレーム数から経過時間を計算
			const progress = Math.min(elapsedTimeMs / applicationTimeLimitMs, 1);
			progressBar.setProgress(progress);
		});

		// ビンゴシートのセルを生成
		const cells: BingoCell[] = []; // 左上から縦にカウントし0-24の順番でセルを格納する配列
		const reverseCells: Record<number, BingoCell> = {}; // セルの番号からセルを逆引きするマップ
		const lines: BingoCell[][] = []; // ビンゴ判定用のライン（行5本、列5本、対角線2本の計12本）

		const cellSize = 90;
		const offsetY = (g.game.height - cellSize * 5) / 2;
		const offsetX = offsetY;
		for (let i = 0; i < 5; i++) {
			for (let j = 0; j < 5; j++) {
				const number = userArray[i * 5 + j];
				const isCenter = (i === 2 && j === 2);
				const cell = new BingoCell({
					scene: scene,
					parent: layers.foreground,
					font: font,
					x: offsetX + i * cellSize,
					y: offsetY + j * cellSize,
					width: cellSize,
					height: cellSize,
					defaultColor: "white",
					checkedColor: "green",
					label: isCenter ? "FREE" : number.toString(),
					assetLoader: assetLoader,
				});

				cells.push(cell);
				if (isCenter) {
					cell.check(); // フリーマスは最初から開いている
				} else {
					reverseCells[number] = cell;
				}
			}
		}

		// ビンゴ判定用ラインの定義
		lines.push(cells.slice(0, 5)); // 行
		lines.push(cells.slice(5, 10));
		lines.push(cells.slice(10, 15));
		lines.push(cells.slice(15, 20));
		lines.push(cells.slice(20, 25));

		for (let i = 0; i < 5; i++) {
			lines.push([cells[i], cells[i + 5], cells[i + 10], cells[i + 15], cells[i + 20]]); // 列
		}

		lines.push([cells[0], cells[6], cells[12], cells[18], cells[24]]); // 対角線
		lines.push([cells[4], cells[8], cells[12], cells[16], cells[20]]);

		// ビンゴマシンの実装
		const lotteryMachine = new LotteryMachine({
			scene: scene,
			parent: layers.foreground,
			x: offsetX,
			y: offsetY - 50 - 20,
			width: cellSize * 5,
			height: 50,
			font: font,
			assetLoader: assetLoader,
		});

		// ビンゴシートの背景
		new g.FilledRect({
			scene: scene,
			parent: layers.background,
			x: offsetX - 10,
			y: offsetY - 10 - 50 - 20,
			width: cellSize * 5 + 20,
			height: cellSize * 5 + 20 + 50 + 20,
			cssColor: "lightGreen",
		});

		// 残りターン表示
		const remainTurnSign = new RemainTurnSign({
			x: g.game.width / 2 - 25,
			y: g.game.height - 350,
			font: font,
			scene: scene,
			layers: layers,
		});

		// スコアボード
		const scoreboard = new Scoreboard({
			x: g.game.width / 2 - 25,
			y: g.game.height - 220,
			font: font,
			scene: scene,
			layers: layers,
			assetLoader: assetLoader,
		});

		// ビンゴ時のアナウンス
		const bingoAnnounce = new BingoAnnounce({
			scene: scene,
			parent: layers.ui,
			x: offsetX,
			y: offsetY,
			width: cellSize * 5,
			height: cellSize * 5,
			font: font,
			fontSize: 64,
			assetLoader: assetLoader,
		});

		// ゲームに参加するためのボタン
		// （参加意思のないユーザーがスコアを獲得してしまいランキングに載ることを防ぐため）
		const joinButton = new JoinButton({
			scene: scene,
			parent: layers.important,
			x: offsetX - 30,
			y: offsetY + cellSize + 30,
			width: cellSize * 5 + 60,
			height: cellSize * 3 - 60,
			font: font,
		});

		let hasJoined = false;
		const scoreBeforeJoined = {
			value: 0,
			reason: "",
		};
		const noticeScore = (score: number, reason: string): void => {
			if (hasJoined) {
				// ニコ生ゲームにスコアを通知
				niconama.noticeScore(score);
			} else {
				// ゲームに参加していない場合はスコアを保存しておく
				scoreBeforeJoined.value = score;
				scoreBeforeJoined.reason = reason;
			}
			scoreboard.setScore(score, reason);
		};
		joinButton.onClick.add(() => {
			if (!hasJoined) {
				console.log("ユーザーがゲームに参加");
				hasJoined = true;
				joinButton.hide();

				// ゲームに参加したタイミングで既にスコアを獲得していた場合は、そのスコアを改めてnoticeScoreしてニコ生ゲームに通知する
				if (scoreBeforeJoined.value > 0) {
					noticeScore(scoreBeforeJoined.value, scoreBeforeJoined.reason);
				} else {
					// スコア0点ではランキングに載らないため、1点だけ追加しておく
					// ビンゴを1回でもした場合は100-75+4=29点以上になるので、スコア計算式上は影響がない
					noticeScore(1, "参加賞！");
				}
			}
		});

		// 数値発表アニメーション
		const timeline = new Timeline(scene);

		let turn = 0;
		let lotteryAnimation: Tween | null = null;
		const lotteryAnimationEntity = new g.E({
			scene: scene,
			parent: layers.ui,
			x: 0,
			y: 0,
			width: g.game.width,
			height: g.game.height,
		});
		let reachCount = 0;
		let bingoCount = 0;
		const reachSound = assetLoader.getAudio("/audio/reach");

		// 抽選にかかる時間をゲームに与えられた時間から決定する
		// もし与えられていない場合は1分あると仮定する
		const maxTurns = 45; // 42ターンくらいで期待値50%のビンゴになるので、45ターンに設定しておけばだれかがビンゴする可能性が高い
		const timePerTurn = (applicationTimeLimitMs !== Infinity ? applicationTimeLimitMs : 1000 * 60) / maxTurns;
		const rollingTime = timePerTurn / 2; // 数値がコロコロ変わる時間（ミリ秒）
		const announceTime = timePerTurn / 2; // 数値が決まってから次のターンに移るまでの時間（ミリ秒）

		lotteryAnimation = timeline.create(lotteryAnimationEntity, { loop: true })
			.call(() => {
				if (turn === openArray.length) {
					if (lotteryAnimation) {
						lotteryAnimation.cancel();
					}
					return;
				} else if (turn > openArray.length) {
					if (lotteryAnimation) {
						lotteryAnimation.cancel();
					}
					return;
				}
				const next = openArray[turn];
				lotteryMachine.announce(next, rollingTime);
				remainTurnSign.setRemainTurn(maxTurns - turn - 1);
			})
			.wait(rollingTime)
			.call(() => {
				const next = openArray[turn];
				if (next in reverseCells) {
					reverseCells[next].check();
				}

				// リーチ数とビンゴ数をカウント
				let newReachCount = 0;
				let newBingoCount = 0;
				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					const checkedCount = line.filter(cell => cell.checked).length;
					if (checkedCount === 4) {
						newReachCount++;
						line.forEach(cell => cell.markAsReach());
					} else if (checkedCount === 5) {
						newBingoCount++;
						line.forEach(cell => cell.markAsBingo());
					}
				}
				if (newReachCount > reachCount) {
					console.log("Reach! Total:", newReachCount);
					if (bingoCount === 0) {
						// ビンゴしてなければリーチが出たタイミングでリーチ音を鳴らす
						reachSound.play();
						// ビンゴ前のリーチは2点（参加賞が1点で、それより高くする）
						noticeScore(2, "リーチ！");
					}
				}
				if (newBingoCount > bingoCount) {
					console.log("Bingo! Total:", newBingoCount);
					if (bingoCount === 0) {
						// 最初のビンゴが出たタイミングでビンゴアナウンス
						bingoAnnounce.announce();
						// スコア計算式:
						// ・ビンゴが出たのが早いほど高得点
						// ・理論上最初のビンゴが出る4ターン目でビンゴすると100点になる
						const score = 100 - (turn - 3);
						noticeScore(score, `${turn}ターンでビンゴ！`);
					}
				}
				reachCount = newReachCount;
				bingoCount = newBingoCount;

				turn++;
			})
			.wait(announceTime);

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
 * ビンゴゲームの一般的な仕様に基づいて、ビンゴシートの配列を生成する関数
 * 1-15がB列、16-30がI列、31-45がN列、46-60がG列、61-75がO列にランダムに配置される
 * @param random
 */
function generateBingoSheetArray(random: g.RandomGenerator): number[] {
	const sheet: number[] = [];

	// 各列ごとに15個の数字から5個をランダムに選ぶ
	// B列: 1-15, I列: 16-30, N列: 31-45, G列: 46-60, O列: 61-75
	for (let col = 0; col < 5; col++) {
		const start = col * 15 + 1;
		// この列の候補となる15個の数字を用意
		const candidates: number[] = [];
		for (let i = start; i < start + 15; i++) {
			candidates.push(i);
		}

		// Fisher-Yatesシャッフルで先頭5個をランダムに選ぶ
		for (let i = candidates.length - 1; i > 0; i--) {
			const j = Math.floor(random.generate() * (i + 1));
			const tmp = candidates[i];
			candidates[i] = candidates[j];
			candidates[j] = tmp;
		}

		// 先頭5個を採用
		for (let i = 0; i < 5; i++) {
			sheet.push(candidates[i]);
		}
	}

	return sheet;
}

/**
 * 1から75までの数字をシャッフルして並べる
 * @returns シャッフルされた数字の配列（長さは75）
 */
function generateBingoArray(random: g.RandomGenerator): number[] {
	const array: number[] = [];
	for (let i = 1; i <= 75; i++) {
		array.push(i);
	}

	// Fisher-Yatesシャッフル
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(random.generate() * (i + 1));
		const tmp = array[i];
		array[i] = array[j];
		array[j] = tmp;
	}

	return array;
}
