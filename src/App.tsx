import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Block, BlockType, CellInfo, Rotation, ToolType } from './types';
import { getBlockCells, getBaseFromCursor, BLOCK_COLORS, BLOCK_BORDER_COLORS } from './tetrominos';

// ===== Grid Constants =====
const GRID_HEIGHT = 3;

// ===== Helper: ユニークID生成 =====
let idCounter = 0;
function generateId(): string {
  return `block-${Date.now()}-${idCounter++}`;
}

// ===== App Component =====
export default function App() {
  // ----- State -----
  const [gridWidth, setGridWidth] = useState<number>(8);
  const [gridWidthInput, setGridWidthInput] = useState<string>('8');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolType>('L');
  const [currentRotation, setCurrentRotation] = useState<Rotation>(0);
  const [memo, setMemo] = useState<string>('');
  const [hoverCell, setHoverCell] = useState<{ y: number; x: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ----- Derived: 占有マップ (3 x gridWidth) -----
  const occupancyGrid = useMemo(() => {
    const grid: (CellInfo | null)[][] = Array.from({ length: GRID_HEIGHT }, () =>
      Array.from<CellInfo | null>({ length: gridWidth }).fill(null)
    );
    for (const block of blocks) {
      const cells = getBlockCells(block.type, block.rotation, block.y, block.x);
      for (const [cy, cx] of cells) {
        if (cy >= 0 && cy < GRID_HEIGHT && cx >= 0 && cx < gridWidth) {
          grid[cy][cx] = { blockId: block.id, blockType: block.type };
        }
      }
    }
    return grid;
  }, [blocks, gridWidth]);

  // ----- Derived: ブロックカウント -----
  const blockCounts = useMemo(() => {
    const counts: Record<BlockType, number> = { L: 0, J: 0, O: 0 };
    for (const block of blocks) {
      counts[block.type]++;
    }
    return counts;
  }, [blocks]);

  // ----- Hover preview computation -----
  const previewInfo = useMemo(() => {
    if (!hoverCell) return null;
    if (currentTool === 'Eraser') return null;

    const blockType = currentTool as BlockType;
    const { baseY, baseX } = getBaseFromCursor(blockType, currentRotation, hoverCell.y, hoverCell.x);
    const cells = getBlockCells(blockType, currentRotation, baseY, baseX);

    // 範囲内チェック
    const inBounds = cells.every(
      ([cy, cx]) => cy >= 0 && cy < GRID_HEIGHT && cx >= 0 && cx < gridWidth
    );

    // 重複チェック
    const noCollision = cells.every(([cy, cx]) => {
      if (cy < 0 || cy >= GRID_HEIGHT || cx < 0 || cx >= gridWidth) return false;
      return occupancyGrid[cy][cx] === null;
    });

    const canPlace = inBounds && noCollision;

    return { cells, canPlace, baseY, baseX };
  }, [hoverCell, currentTool, currentRotation, gridWidth, occupancyGrid]);

  // ----- Keyboard shortcut: R to rotate -----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // テキストエリアやインプットにフォーカスがある場合は無視
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setCurrentRotation((prev) => ((prev + 1) % 4) as Rotation);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ----- Toast auto-dismiss -----
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // ----- Handlers -----
  const handleCellClick = useCallback(
    (y: number, x: number) => {
      if (currentTool === 'Eraser') {
        // 消しゴム: セルにブロックがあれば削除
        const cell = occupancyGrid[y][x];
        if (cell) {
          setBlocks((prev) => prev.filter((b) => b.id !== cell.blockId));
        }
        return;
      }

      // ブロック配置
      if (!previewInfo || !previewInfo.canPlace) return;

      const newBlock: Block = {
        id: generateId(),
        type: currentTool as BlockType,
        rotation: currentRotation,
        y: previewInfo.baseY,
        x: previewInfo.baseX,
      };
      setBlocks((prev) => [...prev, newBlock]);
    },
    [currentTool, currentRotation, occupancyGrid, previewInfo]
  );

  const handleGridWidthInputChange = useCallback(
    (value: string) => {
      setGridWidthInput(value);
      const n = Number(value);
      if (value !== '' && !isNaN(n) && n >= 1 && n <= 100) {
        const w = Math.floor(n);
        setGridWidth(w);
        // 範囲外になったブロックを自動削除
        setBlocks((prev) =>
          prev.filter((block) => {
            const cells = getBlockCells(block.type, block.rotation, block.y, block.x);
            return cells.every(([cy, cx]) => cy >= 0 && cy < GRID_HEIGHT && cx >= 0 && cx < w);
          })
        );
      }
    },
    []
  );

  const handleGridWidthBlur = useCallback(() => {
    // 空欄やバリデーション外の値の場合、現在のgridWidthに戻す
    const n = Number(gridWidthInput);
    if (gridWidthInput === '' || isNaN(n) || n < 1 || n > 100) {
      setGridWidthInput(String(gridWidth));
    }
  }, [gridWidthInput, gridWidth]);

  const handleClearAll = useCallback(() => {
    setBlocks([]);
  }, []);

  const handleCopyCount = useCallback(async () => {
    const text = `${blockCounts.L} ${blockCounts.J} ${blockCounts.O}`;
    try {
      await navigator.clipboard.writeText(text);
      setToastMessage('コピーしました！');
    } catch {
      setToastMessage('コピーに失敗しました');
    }
  }, [blockCounts]);

  // ----- Previewセットを高速検索用にSetに変換 -----
  const previewCellSet = useMemo(() => {
    if (!previewInfo) return new Set<string>();
    return new Set(previewInfo.cells.map(([cy, cx]) => `${cy},${cx}`));
  }, [previewInfo]);

  // ----- Render cell -----
  const renderCell = (y: number, x: number) => {
    const key = `${y},${x}`;
    const occupied = occupancyGrid[y][x];
    const isPreview = previewCellSet.has(key);

    let bgClass = 'bg-gray-100';
    let extraClass = '';

    if (occupied) {
      bgClass = BLOCK_COLORS[occupied.blockType];
      extraClass = `border ${BLOCK_BORDER_COLORS[occupied.blockType]}`;
    }

    if (isPreview && previewInfo) {
      if (previewInfo.canPlace) {
        bgClass = `${BLOCK_COLORS[currentTool as BlockType]} opacity-50`;
      } else {
        bgClass = 'bg-red-400 opacity-50';
      }
    }

    const isEraser = currentTool === 'Eraser';
    const cursorClass = isEraser
      ? occupied
        ? 'cursor-pointer'
        : 'cursor-default'
      : 'cursor-pointer';

    return (
      <div
        key={key}
        className={`w-10 h-10 border border-gray-300 ${bgClass} ${extraClass} ${cursorClass} transition-colors duration-75 select-none`}
        onMouseEnter={() => setHoverCell({ y, x })}
        onMouseLeave={() => setHoverCell(null)}
        onClick={() => handleCellClick(y, x)}
      />
    );
  };

  // ----- Tool button helper -----
  const toolButton = (tool: ToolType, label: string, colorClass: string) => (
    <button
      key={tool}
      onClick={() => setCurrentTool(tool)}
      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all border-2
        ${currentTool === tool
          ? `${colorClass} text-white border-gray-800 ring-2 ring-offset-1 ring-gray-800 scale-105`
          : `${colorClass} text-white border-transparent opacity-70 hover:opacity-100`
        }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">LoJVisualizer</h1>
        <p className="text-sm text-gray-500">L / J / O ブロックを自由に配置・検証</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* ===== Left Panel: Controls ===== */}
        <div className="lg:w-72 flex-shrink-0 space-y-4">
          {/* Grid Width Control */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-2">グリッド幅 (N)</h2>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                value={gridWidthInput}
                onChange={(e) => handleGridWidthInputChange(e.target.value)}
                onBlur={handleGridWidthBlur}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-center font-mono"
              />
              <button
                onClick={handleClearAll}
                className="ml-auto px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
              >
                全クリア
              </button>
            </div>
          </div>

          {/* Tool Selection */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-2">ツール選択</h2>
            <div className="flex flex-wrap gap-2">
              {toolButton('L', 'L', 'bg-orange-500')}
              {toolButton('J', 'J', 'bg-blue-500')}
              {toolButton('O', 'O', 'bg-yellow-400')}
              {toolButton('Eraser', '🧹 消しゴム', 'bg-gray-500')}
            </div>
          </div>

          {/* Block Count */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-2">ブロック数</h2>
            <div className="flex items-center gap-4 text-sm font-mono">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-orange-500 rounded-sm" /> L: {blockCounts.L}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-sm" /> J: {blockCounts.J}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-yellow-400 rounded-sm" /> O: {blockCounts.O}
              </span>
            </div>
            <button
              onClick={handleCopyCount}
              className="mt-2 px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-800 transition-colors"
            >
              📋 カウントをコピー
            </button>
          </div>

          {/* Memo */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-2">メモ</h2>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="考察メモをここに..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        {/* ===== Main Canvas ===== */}
        <div className="flex-1 bg-white rounded-xl shadow p-4 overflow-x-auto">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">
            グリッド (3 × {gridWidth})
          </h2>
          <div
            className="inline-grid gap-0"
            style={{
              gridTemplateColumns: `repeat(${gridWidth}, 2.5rem)`,
              gridTemplateRows: `repeat(${GRID_HEIGHT}, 2.5rem)`,
            }}
          >
            {Array.from({ length: GRID_HEIGHT }, (_, y) =>
              Array.from({ length: gridWidth }, (_, x) => renderCell(y, x))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
