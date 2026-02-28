const imageAssets = [

] as const;

const audioAssets = [

] as const;

const textAssets = [] as const;

/**
 * ゲームで利用可能な画像アセットのリテラル型
 * 全てグローバルアセットである想定
 */
export type ImageAssetName = (typeof imageAssets)[number];

/**
 * ゲームで利用可能な音声アセットのリテラル型
 * 全てグローバルアセットである想定
 */
export type AudioAssetName = (typeof audioAssets)[number];

export type TextAssetName = (typeof textAssets)[number];

export const allAssets = [
	...imageAssets,
	...audioAssets,
	...textAssets,
] as const;

/**
 * アセットを取得する操作をtype safeにするためのユーティリティクラス
 */
export class AssetLoader {
	private readonly _scene: g.Scene;

	public constructor(scene: g.Scene) {
		this._scene = scene;
	}

	public getImage(asset: ImageAssetName): g.ImageAsset {
		return this._scene.asset.getImage(asset);
	}

	public getAudio(asset: AudioAssetName): g.AudioAsset {
		return this._scene.asset.getAudio(asset);
	}

	public getText(asset: TextAssetName): g.TextAsset {
		return this._scene.asset.getText(asset);
	}
}
