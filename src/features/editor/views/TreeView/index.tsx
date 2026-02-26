import React from "react";
import { useTheme } from "styled-components";
import { JSONTree } from "react-json-tree";
import useJson from "../../../../store/useJson";
import { Label } from "./Label";
import { Value } from "./Value";

export const TreeView = () => {
  const theme = useTheme();
  const json = useJson(state => state.json);

  // Safely parse JSON with fallback to empty object
  let data = {};
  try {
    data = json ? JSON.parse(json) : {};
  } catch (error) {
    console.warn("Failed to parse JSON for TreeView:", error);
    data = {};
  }

  return (
    <JSONTree
      hideRoot
      data={data}
      valueRenderer={(valueAsString, value) => <Value {...{ valueAsString, value }} />}
      labelRenderer={(keyPath, nodeType) => <Label {...{ keyPath, nodeType }} />}
      theme={{
        extend: {
          overflow: "scroll",
          height: "100%",
          scheme: "monokai",
          author: "wimer hazenberg (http://www.monokai.nl)",
          base00: theme.GRID_BG_COLOR,
        },
      }}
    />
  );
};
