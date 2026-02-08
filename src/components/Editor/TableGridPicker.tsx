import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';

interface TableGridPickerProps {
  onSelect: (rows: number, cols: number) => void;
  onClose: () => void;
}

const MAX_COLS = 8;
const MAX_ROWS = 6;
const CELL_SIZE = 24;
const CELL_GAP = 2;

/**
 * TableGridPicker - Visual grid for selecting table dimensions
 * 
 * Displays an 8×6 grid where users can hover to preview dimensions
 * and click to insert a table with those dimensions.
 */
export function TableGridPicker({ onSelect, onClose }: TableGridPickerProps): JSX.Element {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number }>({ row: 1, col: 1 });
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>({ row: 1, col: 1 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          setSelectedCell(prev => ({
            ...prev,
            col: Math.min(prev.col + 1, MAX_COLS),
          }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setSelectedCell(prev => ({
            ...prev,
            col: Math.max(prev.col - 1, 1),
          }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedCell(prev => ({
            ...prev,
            row: Math.min(prev.row + 1, MAX_ROWS),
          }));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedCell(prev => ({
            ...prev,
            row: Math.max(prev.row - 1, 1),
          }));
          break;
        case 'Enter':
          e.preventDefault();
          onSelect(selectedCell.row, selectedCell.col);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, onSelect, onClose]);

  // Sync hovered cell with selected cell when using keyboard
  useEffect(() => {
    setHoveredCell(selectedCell);
  }, [selectedCell]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay adding listener to avoid immediate close from the trigger click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleCellHover = useCallback((row: number, col: number) => {
    setHoveredCell({ row, col });
    setSelectedCell({ row, col });
  }, []);

  const handleCellClick = useCallback((row: number, col: number) => {
    onSelect(row, col);
  }, [onSelect]);

  const isHighlighted = (row: number, col: number): boolean => {
    return row <= hoveredCell.row && col <= hoveredCell.col;
  };

  // Calculate grid dimensions
  const gridWidth = MAX_COLS * (CELL_SIZE + CELL_GAP) - CELL_GAP;
  const gridHeight = MAX_ROWS * (CELL_SIZE + CELL_GAP) - CELL_GAP;

  return (
    <div
      ref={containerRef}
      className={cn(
        "table-grid-picker",
        "p-3 rounded-lg shadow-lg z-50",
        "bg-[var(--theme-bg-secondary)]",
        "border border-[var(--theme-border-primary)]"
      )}
      role="grid"
      aria-label="Select table dimensions"
    >
      {/* Grid */}
      <div
        className="grid-container"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${MAX_COLS}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${MAX_ROWS}, ${CELL_SIZE}px)`,
          gap: `${CELL_GAP}px`,
          width: gridWidth,
          height: gridHeight,
        }}
      >
        {Array.from({ length: MAX_ROWS }).map((_, rowIndex) =>
          Array.from({ length: MAX_COLS }).map((_, colIndex) => {
            const row = rowIndex + 1;
            const col = colIndex + 1;
            const highlighted = isHighlighted(row, col);

            return (
              <div
                key={`${row}-${col}`}
                className={cn(
                  "grid-cell rounded-sm transition-colors cursor-pointer",
                  "border border-[var(--theme-border-secondary)]",
                  highlighted
                    ? "bg-[var(--theme-accent-primary)] border-[var(--theme-accent-primary)]"
                    : "bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-primary)]"
                )}
                onMouseEnter={() => handleCellHover(row, col)}
                onClick={() => handleCellClick(row, col)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCellClick(row, col); } }}
                role="gridcell"
                tabIndex={0}
                aria-selected={highlighted}
                aria-label={`${row} rows, ${col} columns`}
              />
            );
          })
        )}
      </div>

      {/* Dimension label */}
      <div className="text-center mt-2 text-xs text-[var(--theme-text-secondary)] font-medium">
        {hoveredCell.col} × {hoveredCell.row} table
      </div>
    </div>
  );
}
