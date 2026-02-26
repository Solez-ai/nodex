import React from "react";
import { Flex, Menu } from "@mantine/core";
import { CgChevronDown } from "react-icons/cg";
import { MdCompareArrows } from "react-icons/md";
import useFile from "../../../store/useFile";
import { useModal } from "../../../store/useModal";
import { StyledToolElement } from "./styles";

export const FileMenu = () => {
  const setVisible = useModal(state => state.setVisible);
  const getContents = useFile(state => state.getContents);
  const getFormat = useFile(state => state.getFormat);

  const handleSave = () => {
    const a = document.createElement("a");
    const file = new Blob([getContents()], { type: "text/plain" });

    a.href = window.URL.createObjectURL(file);
    a.download = `nodex.${getFormat()}`;
    a.click();
  };

  return (
    <Menu shadow="md" withArrow>
      <Menu.Target>
        <StyledToolElement title="File">
          <Flex align="center" gap={3}>
            File
            <CgChevronDown />
          </Flex>
        </StyledToolElement>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item fz={12} onClick={() => setVisible("ImportModal", true)}>
          Import
        </Menu.Item>
        <Menu.Item fz={12} onClick={handleSave}>
          Export
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          fz={12}
          leftSection={<MdCompareArrows size={14} />}
          onClick={() => setVisible("DiffModal", true)}
        >
          Compare / Diff
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
