import type { BlockType, Rotation } from './types';

// ===== テトリミノの形状定義 =====
// 各テトリミノの回転ごとのオフセット [dy, dx][]
// 基準点はバウンディングボックスの左上

/**
 * L-テトリミノ (Lブロック)
 *
 * Rotation 0:    Rotation 1:    Rotation 2:    Rotation 3:
 *  X .            . X            . .            X X
 *  X .            . X            . X            X .
 *  X X            X X            . X            . .
 *                                X X
 *
 * ※ 回転0の形状:
 *  ■ .
 *  ■ .
 *  ■ ■
 */
const L_OFFSETS: Record<Rotation, [number, number][]> = {
  0: [[0, 0], [1, 0], [2, 0], [2, 1]],
  1: [[0, 0], [0, 1], [0, 2], [1, 0]],
  2: [[0, 0], [0, 1], [1, 1], [2, 1]],
  3: [[1, 0], [1, 1], [1, 2], [0, 2]],
};

/**
 * J-テトリミノ (Jブロック)
 *
 * Rotation 0:    Rotation 1:    Rotation 2:    Rotation 3:
 *  . ■            ■ . .          ■ ■            . . ■
 *  . ■            ■ ■ ■          ■ .            ■ ■ ■
 *  ■ ■                           ■ .
 *
 */
const J_OFFSETS: Record<Rotation, [number, number][]> = {
  0: [[0, 1], [1, 1], [2, 0], [2, 1]],
  1: [[0, 0], [1, 0], [1, 1], [1, 2]],
  2: [[0, 0], [0, 1], [1, 0], [2, 0]],
  3: [[0, 0], [0, 1], [0, 2], [1, 2]],
};

/**
 * O-テトリミノ (Oブロック)
 *
 * 全回転共通:
 *  ■ ■
 *  ■ ■
 */
const O_OFFSETS: Record<Rotation, [number, number][]> = {
  0: [[0, 0], [0, 1], [1, 0], [1, 1]],
  1: [[0, 0], [0, 1], [1, 0], [1, 1]],
  2: [[0, 0], [0, 1], [1, 0], [1, 1]],
  3: [[0, 0], [0, 1], [1, 0], [1, 1]],
};

/** 全テトリミノのオフセットマップ */
export const TETROMINO_OFFSETS: Record<BlockType, Record<Rotation, [number, number][]>> = {
  L: L_OFFSETS,
  J: J_OFFSETS,
  O: O_OFFSETS,
};

/**
 * 指定ブロックタイプ・回転・基準点から、実際に占有するセル座標を返す
 */
export function getBlockCells(
  type: BlockType,
  rotation: Rotation,
  baseY: number,
  baseX: number
): [number, number][] {
  return TETROMINO_OFFSETS[type][rotation].map(([dy, dx]) => [baseY + dy, baseX + dx]);
}

/** ブロックタイプごとのTailwind背景色クラス */
export const BLOCK_COLORS: Record<BlockType, string> = {
  O: 'bg-yellow-400',
  L: 'bg-orange-500',
  J: 'bg-blue-500',
};

/** ブロックタイプごとのTailwindボーダー色クラス */
export const BLOCK_BORDER_COLORS: Record<BlockType, string> = {
  O: 'border-yellow-500',
  L: 'border-orange-600',
  J: 'border-blue-600',
};

/**
 * テトリミノのアンカーポイント（マウスカーソルに対応するセル）
 * [dy, dx] はバウンディングボックス左上からのオフセット
 *
 * L rot0: #.    J rot0: .#    O rot0: ##
 *         X.            .X            X#
 *         ##            ##
 */
const L_ANCHORS: Record<Rotation, [number, number]> = {
  0: [1, 0], // X. (中段左)
  1: [0, 1], // 90° CW: ###/X.. → 上段中央
  2: [1, 1], // 180°: ##/.#/.# → 中段右
  3: [1, 1], // 270° CW: ..#/### → 下段中央
};

const J_ANCHORS: Record<Rotation, [number, number]> = {
  0: [1, 1], // .X (中段右)
  1: [1, 1], // 90° CW: #../### → 下段中央
  2: [1, 0], // 180°: ##/#./#. → 中段左
  3: [0, 1], // 270° CW: ###/..# → 上段中央
};

const O_ANCHORS: Record<Rotation, [number, number]> = {
  0: [1, 0], // X# (下段左)
  1: [0, 0],
  2: [0, 1],
  3: [1, 1],
};

/** 全テトリミノのアンカーマップ */
export const TETROMINO_ANCHORS: Record<BlockType, Record<Rotation, [number, number]>> = {
  L: L_ANCHORS,
  J: J_ANCHORS,
  O: O_ANCHORS,
};

/**
 * カーソル位置(cursorY, cursorX)からバウンディングボックス左上の座標を計算する
 */
export function getBaseFromCursor(
  type: BlockType,
  rotation: Rotation,
  cursorY: number,
  cursorX: number
): { baseY: number; baseX: number } {
  const [anchorDy, anchorDx] = TETROMINO_ANCHORS[type][rotation];
  return { baseY: cursorY - anchorDy, baseX: cursorX - anchorDx };
}
