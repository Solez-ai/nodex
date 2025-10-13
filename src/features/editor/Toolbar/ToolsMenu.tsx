import React from "react";
import { Menu, Flex } from "@mantine/core";
import { CgChevronDown } from "react-icons/cg";
import { MdOutlineSearch } from "react-icons/md";
import { useModal } from "../../../store/useModal";
import { StyledToolElement } from "./styles";

export const ToolsMenu = () => {
  const setVisible = useModal(state => state.setVisible);

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
      </Menu.Dropdown>
    </Menu>
  );
};
