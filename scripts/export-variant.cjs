const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");

const configPath = path.resolve(__dirname, "../src/config.ts");
const gameJsonPath = path.resolve(__dirname, "../game.json");
const originalConfig = fs.readFileSync(configPath, "utf-8");
const originalGameJson = fs.readFileSync(gameJsonPath, "utf-8");

const maxTurns = process.argv[2];
const outputName = process.argv[3];
const timeLimit = process.argv[4] ? parseInt(process.argv[4]) : null;

if (!maxTurns || !outputName) {
	console.error("Usage: node export-variant.cjs <maxTurns> <outputName> [timeLimitSeconds]");
	process.exit(1);
}

try {
	// config.tsのMAX_TURNSを書き換え
	const modifiedConfig = originalConfig.replace(
		/export const MAX_TURNS = \d+;/,
		`export const MAX_TURNS = ${maxTurns};`
	);
	fs.writeFileSync(configPath, modifiedConfig, "utf-8");

	// game.jsonのtotalTimeLimitを書き換え
	if (timeLimit != null) {
		const gameJson = JSON.parse(originalGameJson);
		gameJson.environment.nicolive.preferredSessionParameters.totalTimeLimit = timeLimit;
		fs.writeFileSync(gameJsonPath, JSON.stringify(gameJson, null, "\t") + "\n", "utf-8");
	}

	// ビルド＆エクスポート
	execSync(`npm run build && akashic export zip --nicolive --force --output ${outputName}`, {
		cwd: path.resolve(__dirname, ".."),
		stdio: "inherit",
	});
} finally {
	// 必ず元に戻す
	fs.writeFileSync(configPath, originalConfig, "utf-8");
	fs.writeFileSync(gameJsonPath, originalGameJson, "utf-8");
}
