import React from "react";
import { Menu, Flex, Divider } from "@mantine/core";
import { CgChevronDown } from "react-icons/cg";
import { MdOutlineSearch, MdAutoAwesome, MdKey } from "react-icons/md";
import useAI from "../../../store/useAI";
import useFile from "../../../store/useFile";
import { useModal } from "../../../store/useModal";
import { StyledToolElement } from "./styles";

export const ToolsMenu = () => {
  const setVisible = useModal(state => state.setVisible);
  const fetchInsights = useAI(state => state.fetchInsights);
  const aiLoading = useAI(state => state.loading);
  const apiKey = useAI(state => state.apiKey);
  const getContents = useFile(state => state.getContents);
  const getFormat = useFile(state => state.getFormat);

  // Load API key from localStorage on mount
  React.useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("nodex_gemini_api_key") : null;
    if (stored) useAI.getState().setApiKey(stored);
  }, []);

  const handleExplainData = () => {
    const hasKey =
      apiKey || (typeof window !== "undefined" && localStorage.getItem("nodex_gemini_api_key"));
    if (!hasKey) {
      setVisible("AISettingsModal", true);
      return;
    }
    fetchInsights(getContents(), getFormat());
  };

  return (
    <Menu shadow="md" withArrow>
      <Menu.Target>
        <StyledToolElement>
          <Flex align="center" gap={3}>
            Tools <CgChevronDown />
          </Flex>
        </StyledToolElement>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          fz={12}
          leftSection={<MdOutlineSearch />}
          onClick={() => setVisible("NodeModal", true)}
        >
          Search Nodes
        </Menu.Item>
        <Divider />
        <Menu.Item
          fz={12}
          leftSection={<MdAutoAwesome size={13} color="#818cf8" />}
          onClick={handleExplainData}
          disabled={aiLoading}
        >
          {aiLoading ? "Analyzing..." : "Explain Data (AI)"}
        </Menu.Item>
        <Menu.Item
          fz={12}
          leftSection={<MdKey size={13} />}
          onClick={() => setVisible("AISettingsModal", true)}
        >
          AI Settings
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
