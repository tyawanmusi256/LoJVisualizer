// ===== Type Definitions =====

export type BlockType = 'L' | 'J' | 'O';
export type ToolType = BlockType | 'Eraser';
export type Rotation = 0 | 1 | 2 | 3;

export interface Block {
  id: string;
  type: BlockType;
  rotation: Rotation;
  y: number; // 基準点（バウンディングボックス左上）のY座標
  x: number; // 基準点（バウンディングボックス左上）のX座標
}

/** グリッド上の各セルの状態 */
export interface CellInfo {
  blockId: string;
  blockType: BlockType;
}
