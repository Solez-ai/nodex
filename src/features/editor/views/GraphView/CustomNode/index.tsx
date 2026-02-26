import React from "react";
import { useComputedColorScheme } from "@mantine/core";
import type { NodeProps } from "reaflow";
import { Node } from "reaflow";
import useDiff from "../../../../../store/useDiff";
import { useModal } from "../../../../../store/useModal";
import type { NodeData } from "../../../../../types/graph";
import useGraph from "../stores/useGraph";
import { ObjectNode } from "./ObjectNode";
import { TextNode } from "./TextNode";

export interface CustomNodeProps {
  node: NodeData;
  x: number;
  y: number;
  hasCollapse?: boolean;
}

const DIFF_COLORS: Record<string, string> = {
  added: "#22c55e",
  removed: "#ef4444",
  modified: "#f59e0b",
};

function getDiffStatusForNode(node: NodeData, byPath: Record<string, string>): string | null {
  // Match by node path array (e.g. ["users", 0, "name"])
  if (!node.path || node.path.length === 0) return null;
  const pathStr = node.path.join(".");
  const status = byPath[pathStr];
  return status && status !== "unchanged" ? status : null;
}

const CustomNodeWrapper = (nodeProps: NodeProps<NodeData>) => {
  const setSelectedNode = useGraph(state => state.setSelectedNode);
  const setVisible = useModal(state => state.setVisible);
  const colorScheme = useComputedColorScheme();
  const diffActive = useDiff(state => state.active);
  const diffResult = useDiff(state => state.diffResult);

  const nodeData = nodeProps.properties as unknown as NodeData;

  const diffStatus =
    diffActive && diffResult ? getDiffStatusForNode(nodeData, diffResult.byPath) : null;

  const handleNodeClick = React.useCallback(
    (_: React.MouseEvent<SVGGElement, MouseEvent>, data: NodeData) => {
      if (setSelectedNode) setSelectedNode(data);
      setVisible("NodeModal", true);
    },
    [setSelectedNode, setVisible]
  );

  const strokeColor = diffStatus
    ? DIFF_COLORS[diffStatus]
    : colorScheme === "dark"
      ? "#424242"
      : "#BCBEC0";

  const strokeWidth = diffStatus ? 2.5 : 1;

  return (
    <Node
      {...nodeProps}
      onClick={handleNodeClick as any}
      animated={false}
      label={null as any}
      onEnter={ev => {
        ev.currentTarget.style.stroke = diffStatus ? DIFF_COLORS[diffStatus]! : "#3B82F6";
      }}
      onLeave={ev => {
        ev.currentTarget.style.stroke = strokeColor;
      }}
      style={{
        fill: colorScheme === "dark" ? "#292929" : "#ffffff",
        stroke: strokeColor,
        strokeWidth,
      }}
    >
      {({ node, x, y }) => {
        const hasKey = nodeData.text?.[0]?.key;
        if (!hasKey) return <TextNode node={nodeData} x={x} y={y} />;

        return <ObjectNode node={node as NodeData} x={x} y={y} />;
      }}
    </Node>
  );
};

export const CustomNode = React.memo(CustomNodeWrapper);
