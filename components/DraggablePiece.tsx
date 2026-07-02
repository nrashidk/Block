import React, { useRef, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  Animated as RNAnimated,
} from "react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { BlockShape, GRID_SIZE } from "@/lib/game-types";
import { CELL_SIZE, GRID_PADDING, GRID_BORDER } from "./GameGrid";
import BlockPiece from "./BlockPiece";

const CELL_STEP = CELL_SIZE + 1;
const PIECE_CELL = Math.floor(CELL_SIZE * 0.6);
const CONTAINER_PAD = 4;
const CONTAINER_MIN = 44;
// How many cells the piece (and its shadow) float above your fingertip.
// 0 = directly under your finger, 1 = just above it, 2 = higher. Tune to taste.
const DRAG_LIFT_CELLS = 1;
const DRAG_LIFT_OFFSET = -(CELL_STEP * DRAG_LIFT_CELLS);

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

interface DraggablePieceProps {
  piece: BlockShape;
  index: number;
  gridTop: number;
  gridLeft: number;
  onDragStart: () => void;
  onDragMove: (row: number, col: number) => void;
  onDragEnd: (row: number, col: number) => void;
  onDragCancel: () => void;
}

export default function DraggablePiece({
  piece,
  index,
  gridTop,
  gridLeft,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: DraggablePieceProps) {
  const pan = useRef(new RNAnimated.ValueXY()).current;
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  const lastGridPos = useRef({ row: -1, col: -1 });
  const [dragging, setDragging] = useState(false);
  // While the piece is over the board we hide this floating copy and let the
  // snapped grid preview be the single source of truth (piece == shadow).
  const [overGrid, setOverGrid] = useState(false);
  const overGridRef = useRef(false);

  const pieceRef = useRef(piece);
  const gridTopRef = useRef(gridTop);
  const gridLeftRef = useRef(gridLeft);
  const onDragStartRef = useRef(onDragStart);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);
  const onDragCancelRef = useRef(onDragCancel);

  useEffect(() => {
    pieceRef.current = piece;
    pan.stopAnimation();
    pan.setValue({ x: 0, y: 0 });
    scaleAnim.stopAnimation();
    scaleAnim.setValue(1);
  }, [piece]);

  useEffect(() => {
    gridTopRef.current = gridTop;
  }, [gridTop]);
  useEffect(() => {
    gridLeftRef.current = gridLeft;
  }, [gridLeft]);
  useEffect(() => {
    onDragStartRef.current = onDragStart;
  }, [onDragStart]);
  useEffect(() => {
    onDragMoveRef.current = onDragMove;
  }, [onDragMove]);
  useEffect(() => {
    onDragEndRef.current = onDragEnd;
  }, [onDragEnd]);
  useEffect(() => {
    onDragCancelRef.current = onDragCancel;
  }, [onDragCancel]);

  const pieceDims = () => {
    const p = pieceRef.current;
    return { rows: p.cells.length, cols: p.cells[0]?.length || 1 };
  };

  // Pure finger-to-grid mapping. No per-piece measurement: the piece is
  // centered on the finger horizontally and floated DRAG_LIFT_CELLS above it.
  // Inputs (finger position + grid position) are both reliable, so this is
  // deterministic and cannot drift.
  const getRawGridPosition = (
    moveX: number,
    moveY: number
  ): { row: number; col: number } => {
    const cellsLeft = gridLeftRef.current + GRID_BORDER + GRID_PADDING;
    const cellsTop = gridTopRef.current + GRID_BORDER + GRID_PADDING;

    const { rows: pieceRows, cols: pieceCols } = pieceDims();
    const rowOffset = Math.floor(pieceRows / 2);
    const colOffset = Math.floor(pieceCols / 2);

    const pieceCenterX = moveX;
    const pieceCenterY = moveY + DRAG_LIFT_OFFSET;

    const rawCol = Math.floor((pieceCenterX - cellsLeft) / CELL_STEP);
    const rawRow = Math.floor((pieceCenterY - cellsTop) / CELL_STEP);

    return { row: rawRow - rowOffset, col: rawCol - colOffset };
  };

  const isNearGrid = (
    raw: { row: number; col: number },
    rows: number,
    cols: number
  ) =>
    raw.row > -rows &&
    raw.row < GRID_SIZE &&
    raw.col > -cols &&
    raw.col < GRID_SIZE;

  const endDrag = () => {
    setDragging(false);
    overGridRef.current = false;
    setOverGrid(false);
    RNAnimated.parallel([
      RNAnimated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }),
      RNAnimated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
        friction: 6,
      }),
    ]).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastGridPos.current = { row: -1, col: -1 };
        overGridRef.current = false;
        setOverGrid(false);
        pan.stopAnimation();
        pan.setValue({ x: 0, y: 0 });
        setDragging(true);

        RNAnimated.spring(scaleAnim, {
          toValue: 1.1,
          useNativeDriver: true,
          friction: 6,
        }).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onDragStartRef.current();
      },
      onPanResponderMove: (_, gesture) => {
        pan.setValue({ x: gesture.dx, y: gesture.dy + DRAG_LIFT_OFFSET });

        const raw = getRawGridPosition(gesture.moveX, gesture.moveY);
        const { rows, cols } = pieceDims();
        const nearNow = isNearGrid(raw, rows, cols);
        if (nearNow !== overGridRef.current) {
          overGridRef.current = nearNow;
          setOverGrid(nearNow);
        }
        const out = nearNow
          ? {
              row: clamp(raw.row, 0, GRID_SIZE - rows),
              col: clamp(raw.col, 0, GRID_SIZE - cols),
            }
          : raw;

        if (
          out.row !== lastGridPos.current.row ||
          out.col !== lastGridPos.current.col
        ) {
          lastGridPos.current = out;
          onDragMoveRef.current(out.row, out.col);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        endDrag();

        const dragDist = Math.abs(gesture.dx) + Math.abs(gesture.dy);
        if (dragDist < CELL_STEP) {
          onDragCancelRef.current();
          return;
        }

        const raw = getRawGridPosition(gesture.moveX, gesture.moveY);
        const { rows, cols } = pieceDims();
        if (isNearGrid(raw, rows, cols)) {
          onDragEndRef.current(
            clamp(raw.row, 0, GRID_SIZE - rows),
            clamp(raw.col, 0, GRID_SIZE - cols)
          );
        } else {
          onDragCancelRef.current();
        }
      },
      onPanResponderTerminate: () => {
        endDrag();
        onDragCancelRef.current();
      },
    })
  ).current;

  return (
    <RNAnimated.View
      style={[
        styles.container,
        { opacity: overGrid ? 0 : 1 },
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: scaleAnim },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View collapsable={false} style={styles.pieceContainer}>
        <BlockPiece piece={piece} cellSize={dragging ? CELL_SIZE : PIECE_CELL} />
      </View>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
  },
  pieceContainer: {
    padding: CONTAINER_PAD,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: CONTAINER_MIN,
    minHeight: CONTAINER_MIN,
    alignItems: "center",
    justifyContent: "center",
  },
});
