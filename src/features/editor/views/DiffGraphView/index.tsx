import React from "react";
import { Text, Badge, Group, useComputedColorScheme } from "@mantine/core";
import styled from "styled-components";
import { Allotment } from "allotment";
import { Space } from "react-zoomable-ui";
import { Canvas, Edge, Node } from "reaflow";
import type { NodeProps, EdgeProps } from "reaflow";
import type { CanvasRef } from "reaflow/dist/Canvas";
import type { ElkRoot } from "reaflow/dist/layout/useLayout";
import type { DiffStatus } from "../../../../lib/diff/jsonDiff";
import useDiff from "../../../../store/useDiff";
import type { NodeData, EdgeData } from "../../../../types/graph";
import { parser } from "../GraphView/lib/jsonParser";

// ─── Styled Wrappers ────────────────────────────────────────────────────────

const SplitWrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const SplitAllotment = styled(Allotment)`
  height: 100%;

  .split-view-separator {
    width: 10px !important;
    background: ${({ theme }) => theme.BACKGROUND_SECONDARY};
    transition: background-color 120ms ease;
  }

  .split-view-separator:hover,
  .split-view-separator.split-view-separator-active {
    background: ${({ theme }) => theme.INTERACTIVE_NORMAL};
  }
`;

const HeaderBar = styled.div<{ $side: "A" | "B" }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 12px;
  background: ${({ theme }) => theme.TOOLBAR_BG};
  border-bottom: 2px solid
    ${({ $side }) => ($side === "A" ? "rgba(239,68,68,0.5)" : "rgba(34,197,94,0.5)")};
  flex-shrink: 0;
`;

const CanvasWrapper = styled.div<{ $showRulers: boolean }>`
  position: relative;
  flex: 1;
  overflow: hidden;

  --bg-color: ${({ theme }) => theme.GRID_BG_COLOR};
  --line-color-1: ${({ theme }) => theme.GRID_COLOR_PRIMARY};
  --line-color-2: ${({ theme }) => theme.GRID_COLOR_SECONDARY};

  background-color: var(--bg-color);
  ${({ $showRulers }) =>
    $showRulers &&
    `
    background-image: linear-gradient(var(--line-color-1) 1.5px, transparent 1.5px),
      linear-gradient(90deg, var(--line-color-1) 1.5px, transparent 1.5px),
      linear-gradient(var(--line-color-2) 1px, transparent 1px),
      linear-gradient(90deg, var(--line-color-2) 1px, transparent 1px);
    background-position: -1.5px -1.5px, -1.5px -1.5px, -1px -1px, -1px -1px;
    background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
  `};
`;

// ─── Diff Color Mapping ──────────────────────────────────────────────────────

const DIFF_STROKE: Record<DiffStatus, string | null> = {
  added: "#22c55e",
  removed: "#ef4444",
  modified: "#f59e0b",
  unchanged: null,
};

const DIFF_FILL: Record<DiffStatus, string | null> = {
  added: "rgba(34,197,94,0.08)",
  removed: "rgba(239,68,68,0.08)",
  modified: "rgba(245,158,11,0.08)",
  unchanged: null,
};

// ─── Per-node diff lookup ────────────────────────────────────────────────────

function getNodeDiffStatus(node: NodeData, byPath: Record<string, DiffStatus>): DiffStatus {
  if (!node.path || node.path.length === 0) return "unchanged";
  const status = byPath[node.path.join(".")];
  return status ?? "unchanged";
}

// ─── Single Diff Graph Canvas ─────────────────────────────────────────────

interface DiffCanvasProps {
  nodes: NodeData[];
  edges: EdgeData[];
  byPath: Record<string, DiffStatus>;
  /** Which side perspective: A sees removed/modified, B sees added/modified */
  perspective: "A" | "B";
  colorScheme: "dark" | "light";
  graphVersion: string;
}

function getEffectiveStatus(status: DiffStatus, perspective: "A" | "B"): DiffStatus {
  if (perspective === "A" && status === "added") return "unchanged";
  if (perspective === "B" && status === "removed") return "unchanged";
  return status;
}

const DiffCanvas = ({
  nodes,
  edges,
  byPath,
  perspective,
  colorScheme,
  graphVersion,
}: DiffCanvasProps) => {
  const [paneW, setPaneW] = React.useState(2000);
  const [paneH, setPaneH] = React.useState(2000);
  const cameraRef = React.useRef<any>(null);
  const canvasRef = React.useRef<CanvasRef | null>(null);

  const onLayoutChange = React.useCallback((layout: ElkRoot) => {
    if (layout.width && layout.height) {
      setPaneW(layout.width + 50);
      setPaneH((layout.height as number) + 50);
      window.setTimeout(() => {
        const canvasEl = canvasRef.current?.containerRef.current;
        if (!canvasEl) return;
        cameraRef.current?.centerFitElementIntoView(canvasEl, {
          elementExtraMarginForZoom: 120,
          maxZoom: 1.5,
          minZoom: 0.2,
        });
      }, 50);
    }
  }, []);

  const NodeRenderer = React.useCallback(
    (nodeProps: NodeProps<NodeData>) => {
      const nodeData = nodeProps.properties as unknown as NodeData;
      const status = getNodeDiffStatus(nodeData, byPath);
      const effectiveStatus = getEffectiveStatus(status, perspective);

      const stroke =
        DIFF_STROKE[effectiveStatus] ?? (colorScheme === "dark" ? "#424242" : "#BCBEC0");
      const fill = DIFF_FILL[effectiveStatus] ?? (colorScheme === "dark" ? "#292929" : "#ffffff");

      return (
        <Node
          {...nodeProps}
          animated={false}
          label={null as any}
          style={{
            fill,
            stroke,
            strokeWidth: effectiveStatus !== "unchanged" ? 2.5 : 1,
          }}
        >
          {({ width, height }) => {
            const rows = nodeData.text ?? [];
            const hasKey = rows[0]?.key;
            const lineH = 20;
            const pad = 8;

            if (!hasKey && rows[0]) {
              return (
                <foreignObject x={0} y={0} width={width} height={height}>
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "monospace",
                      fontSize: 12,
                      fontWeight: 500,
                      color: colorScheme === "dark" ? "#e5e7eb" : "#374151",
                      padding: "0 8px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {String(rows[0].value ?? "")}
                  </div>
                </foreignObject>
              );
            }

            return (
              <foreignObject x={0} y={0} width={width} height={height}>
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    fontFamily: "monospace",
                    fontSize: 12,
                    overflow: "hidden",
                  }}
                >
                  {rows.map((row, i) => {
                    const rawRowStatus = row.key
                      ? (byPath[[...(nodeData.path ?? []), row.key].join(".")] ?? effectiveStatus)
                      : effectiveStatus;
                    const rowStatus = getEffectiveStatus(rawRowStatus, perspective);
                    const rowColor =
                      DIFF_STROKE[rowStatus] ?? (colorScheme === "dark" ? "#e5e7eb" : "#374151");
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          padding: `0 ${pad}px`,
                          height: lineH,
                          lineHeight: `${lineH}px`,
                          borderBottom:
                            i < rows.length - 1
                              ? `1px solid ${colorScheme === "dark" ? "#333" : "#e5e7eb"}`
                              : "none",
                          background:
                            rowStatus !== "unchanged" && rowStatus !== effectiveStatus
                              ? (DIFF_FILL[rowStatus] ?? "transparent")
                              : "transparent",
                        }}
                      >
                        {row.key !== null && (
                          <span
                            style={{
                              color: rowColor,
                              fontWeight: 700,
                              marginRight: 6,
                              flexShrink: 0,
                            }}
                          >
                            {row.key}:
                          </span>
                        )}
                        <span
                          style={{
                            color: colorScheme === "dark" ? "#9ca3af" : "#6b7280",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.type === "object"
                            ? `{${row.childrenCount ?? 0} keys}`
                            : row.type === "array"
                              ? `[${row.childrenCount ?? 0} items]`
                              : String(row.value ?? "null")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </foreignObject>
            );
          }}
        </Node>
      );
    },
    [byPath, colorScheme, perspective]
  );

  const EdgeRenderer = React.useCallback(
    (edgeProps: EdgeProps) => (
      <Edge
        {...edgeProps}
        style={{
          stroke: colorScheme === "dark" ? "#444444" : "#BCBEC0",
          strokeWidth: 1.5,
        }}
      />
    ),
    [colorScheme]
  );

  return (
    <Space
      onCreate={ref => {
        cameraRef.current = ref.camera;
      }}
      pollForElementResizing
      className={`diff-space-${perspective}`}
    >
      <Canvas
        key={`${perspective}-${graphVersion}`}
        ref={canvasRef}
        className={`diff-canvas-${perspective}`}
        onLayoutChange={onLayoutChange}
        node={NodeRenderer}
        edge={EdgeRenderer}
        nodes={nodes}
        edges={edges}
        arrow={null}
        maxHeight={paneH}
        maxWidth={paneW}
        height={paneH}
        width={paneW}
        direction="RIGHT"
        pannable={false}
        zoomable={false}
        animated={false}
        readonly={true}
        dragEdge={null}
        dragNode={null}
        fit={true}
      />
    </Space>
  );
};

// ─── Legend ──────────────────────────────────────────────────────────────────

const Legend = () => (
  <Group gap="md" justify="center" py={4} style={{ flexShrink: 0 }}>
    {(
      [
        { color: "#22c55e", label: "Added" },
        { color: "#ef4444", label: "Removed" },
        { color: "#f59e0b", label: "Modified" },
      ] as const
    ).map(({ color, label }) => (
      <Group key={label} gap={5}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 2,
            background: color,
            flexShrink: 0,
          }}
        />
        <Text size="xs" c="dimmed">
          {label}
        </Text>
      </Group>
    ))}
  </Group>
);

// ─── Main DiffGraphView ─────────────────────────────────────────────────────

export const DiffGraphView = () => {
  const diffResult = useDiff(state => state.diffResult);
  const versionA = useDiff(state => state.versionA);
  const versionB = useDiff(state => state.versionB);
  const colorScheme = useComputedColorScheme();

  const graphA = React.useMemo(() => {
    try {
      return parser(versionA);
    } catch {
      return { nodes: [], edges: [] };
    }
  }, [versionA]);

  const graphB = React.useMemo(() => {
    try {
      return parser(versionB);
    } catch {
      return { nodes: [], edges: [] };
    }
  }, [versionB]);

  const byPath = diffResult?.byPath ?? {};

  return (
    <SplitWrapper>
      {/* Colour legend */}
      <Legend />

      {/* Split panes */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <SplitAllotment defaultSizes={[1, 1]}>
          {/* ── Side A ── */}
          <Allotment.Pane minSize={200}>
            <SplitWrapper>
              <HeaderBar $side="A">
                <Badge color="red" variant="filled" size="sm">
                  A
                </Badge>
                <Text size="xs" fw={600} c="dimmed">
                  Original — nodes removed / modified highlighted
                </Text>
              </HeaderBar>
              <CanvasWrapper $showRulers={true}>
                <DiffCanvas
                  nodes={graphA.nodes}
                  edges={graphA.edges}
                  byPath={byPath}
                  perspective="A"
                  colorScheme={colorScheme}
                  graphVersion={versionA}
                />
              </CanvasWrapper>
            </SplitWrapper>
          </Allotment.Pane>

          {/* ── Side B ── */}
          <Allotment.Pane minSize={200}>
            <SplitWrapper>
              <HeaderBar $side="B">
                <Badge color="green" variant="filled" size="sm">
                  B
                </Badge>
                <Text size="xs" fw={600} c="dimmed">
                  New — nodes added / modified highlighted
                </Text>
              </HeaderBar>
              <CanvasWrapper $showRulers={true}>
                <DiffCanvas
                  nodes={graphB.nodes}
                  edges={graphB.edges}
                  byPath={byPath}
                  perspective="B"
                  colorScheme={colorScheme}
                  graphVersion={versionB}
                />
              </CanvasWrapper>
            </SplitWrapper>
          </Allotment.Pane>
        </SplitAllotment>
      </div>
    </SplitWrapper>
  );
};
