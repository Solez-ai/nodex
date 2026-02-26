import React from "react";
import { Group, Text, ActionIcon, Badge, Tooltip } from "@mantine/core";
import styled from "styled-components";
import { MdClose, MdAdd, MdRemove, MdEdit } from "react-icons/md";
import useDiff from "../../store/useDiff";

const BannerWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  background: ${({ theme }) => theme.TOOLBAR_BG};
  border-bottom: 2px solid #3b82f6;
  gap: 12px;
  height: 30px;
  z-index: 35;
  flex-shrink: 0;
`;

export const DiffSummaryBanner = () => {
  const active = useDiff(state => state.active);
  const diffResult = useDiff(state => state.diffResult);
  const deactivate = useDiff(state => state.deactivate);

  if (!active || !diffResult) return null;

  const counts = { added: 0, removed: 0, modified: 0 };
  Object.values(diffResult.byPath).forEach(status => {
    if (status === "added") counts.added++;
    else if (status === "removed") counts.removed++;
    else if (status === "modified") counts.modified++;
  });

  return (
    <BannerWrapper>
      <Group gap="xs" align="center">
        <Text size="xs" fw={600} c="blue">
          Diff View Active
        </Text>
        <Tooltip label="Added paths" withArrow>
          <Badge size="sm" color="green" leftSection={<MdAdd size={10} />} variant="light">
            {counts.added}
          </Badge>
        </Tooltip>
        <Tooltip label="Removed paths" withArrow>
          <Badge size="sm" color="red" leftSection={<MdRemove size={10} />} variant="light">
            {counts.removed}
          </Badge>
        </Tooltip>
        <Tooltip label="Modified paths" withArrow>
          <Badge size="sm" color="yellow" leftSection={<MdEdit size={10} />} variant="light">
            {counts.modified}
          </Badge>
        </Tooltip>
      </Group>
      <ActionIcon size="sm" variant="subtle" onClick={deactivate} title="Exit Diff View">
        <MdClose size={14} />
      </ActionIcon>
    </BannerWrapper>
  );
};
