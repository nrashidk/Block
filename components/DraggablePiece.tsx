import React, { useRef, useEffect } from "react";
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
  // Ref to the static piece container for measureInWindow at drag start
  const containerRef = useRef<View>(null);
  // Offset from the initial touch point to the piece's visual center.
  // Captured at onPanResponderGrant so getGridPosition maps the piece
  // center (not the raw finger tip) to grid coordinates.
  // Initialised to {0,0} so the fallback is the original behaviour.
  const touchOffsetRef = useRef({ x: 0, y: 0 });
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

  // Returns the top-left grid cell {row, col} that the piece should occupy
  // given the current absolute touch position (gesture.moveX / gesture.moveY).
  // touchOffsetRef corrects for where on the piece the user initially touched,
  // so the highlight tracks the piece's visual centre rather than the finger tip.
  const getGridPosition = (
    moveX: number,
    moveY: number
  ): { row: number; col: number } => {
    const cellsLeft = gridLeftRef.current + GRID_BORDER + GRID_PADDING;
    const cellsTop = gridTopRef.current + GRID_BORDER + GRID_PADDING;

    const p = pieceRef.current;
    const pieceRows = p.cells.length;
    const pieceCols = p.cells[0]?.length || 1;
    const rowOffset = Math.floor(pieceRows / 2);
    const colOffset = Math.floor(pieceCols / 2);

    // Subtract the finger-to-centre offset so we use the piece's visual
    // centre rather than the raw touch point for the column/row lookup.
    const pieceCenterX = moveX - touchOffsetRef.current.x;
    const pieceCenterY = moveY - touchOffsetRef.current.y + DRAG_LIFT_OFFSET;

    const rawCol = Math.floor((pieceCenterX - cellsLeft) / CELL_STEP);
    const rawRow = Math.floor((pieceCenterY - cellsTop) / CELL_STEP);

    return { row: rawRow - rowOffset, col: rawCol - colOffset };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gesture) => {
        lastGridPos.current = { row: -1, col: -1 };
        pan.stopAnimation();
        pan.setValue({ x: 0, y: 0 });

        // Reset offset to {0,0} so the first move events degrade gracefully
        // to the original behaviour while measureInWindow resolves.
        touchOffsetRef.current = { x: 0, y: 0 };

        // After pan is reset the piece is at its tray position. Measure its
        // actual centre and store the delta from where the user touched it.
        // This corrects the systematic shadow drift when the user touches
        // anywhere other than the exact visual centre of the piece.
        containerRef.current?.measureInWindow((x, y, w, h) => {
          if (w > 0 && h > 0) {
            touchOffsetRef.current = {
              x: gesture.x0 - (x + w / 2),
              y: gesture.y0 - (y + h / 2),
            };
          }
        });

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
        const pos = getGridPosition(gesture.moveX, gesture.moveY);
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

        const pos = getGridPosition(gesture.moveX, gesture.moveY);
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
      <View ref={containerRef} collapsable={false} style={styles.pieceContainer}>
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
