import React, { useRef, useEffect, useCallback } from "react";
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
const DRAG_LIFT_CELLS = 2;
const DRAG_LIFT_OFFSET = -(CELL_STEP * DRAG_LIFT_CELLS);

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

  const pieceRef = useRef(piece);
  const gridTopRef = useRef(gridTop);
  const gridLeftRef = useRef(gridLeft);
  const containerRef = useRef<View>(null);
  const pieceCenterRef = useRef({ x: 0, y: 0 });
  const onDragStartRef = useRef(onDragStart);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);
  const onDragCancelRef = useRef(onDragCancel);

  const captureCenter = useCallback(() => {
    containerRef.current?.measureInWindow((x, y, w, h) => {
      if (w > 0 && h > 0) {
        pieceCenterRef.current = { x: x + w / 2, y: y + h / 2 };
      }
    });
  }, []);

  useEffect(() => {
    pieceRef.current = piece;
    pan.stopAnimation();
    pan.setValue({ x: 0, y: 0 });
    scaleAnim.stopAnimation();
    scaleAnim.setValue(1);
    const timer = setTimeout(captureCenter, 50);
    return () => clearTimeout(timer);
  }, [piece, captureCenter]);

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

  const getGridPosition = (
    dx: number,
    dy: number
  ): { row: number; col: number } => {
    const cellsLeft = gridLeftRef.current + GRID_BORDER + GRID_PADDING;
    const cellsTop = gridTopRef.current + GRID_BORDER + GRID_PADDING;

    const p = pieceRef.current;
    const pieceRows = p.cells.length;
    const pieceCols = p.cells[0]?.length || 1;
    const rowOffset = Math.floor(pieceRows / 2);
    const colOffset = Math.floor(pieceCols / 2);

    // Use piece center + drag delta, not raw touch position.
    // This ensures the shadow tracks the visual piece center regardless
    // of where on the piece the user initially touched.
    const pieceCenterX = pieceCenterRef.current.x + dx;
    const pieceCenterY = pieceCenterRef.current.y + dy + DRAG_LIFT_OFFSET;

    const rawCol = Math.floor((pieceCenterX - cellsLeft) / CELL_STEP);
    const rawRow = Math.floor((pieceCenterY - cellsTop) / CELL_STEP);

    return { row: rawRow - rowOffset, col: rawCol - colOffset };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastGridPos.current = { row: -1, col: -1 };
        pan.stopAnimation();
        pan.setValue({ x: 0, y: 0 });

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
        const pos = getGridPosition(gesture.dx, gesture.dy);
        if (
          pos.row !== lastGridPos.current.row ||
          pos.col !== lastGridPos.current.col
        ) {
          lastGridPos.current = pos;
          onDragMoveRef.current(pos.row, pos.col);
        }
      },
      onPanResponderRelease: (_, gesture) => {
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

        const dragDist = Math.abs(gesture.dx) + Math.abs(gesture.dy);
        if (dragDist < CELL_STEP) {
          onDragCancelRef.current();
          return;
        }

        const pos = getGridPosition(gesture.dx, gesture.dy);
        const p = pieceRef.current;
        const pieceRows = p.cells.length;
        const pieceCols = p.cells[0]?.length || 1;
        if (
          pos.row >= -pieceRows + 1 &&
          pos.row < GRID_SIZE &&
          pos.col >= -pieceCols + 1 &&
          pos.col < GRID_SIZE
        ) {
          onDragEndRef.current(pos.row, pos.col);
        } else {
          onDragCancelRef.current();
        }
      },
      onPanResponderTerminate: () => {
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
        onDragCancelRef.current();
      },
    })
  ).current;

  return (
    <RNAnimated.View
      style={[
        styles.container,
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
      <View ref={containerRef} collapsable={false} style={styles.pieceContainer} onLayout={captureCenter}>
        <BlockPiece piece={piece} cellSize={PIECE_CELL} />
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
