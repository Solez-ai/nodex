import React from "react";
import {
  Stack,
  Text,
  Skeleton,
  Alert,
  Badge,
  ScrollArea,
  ActionIcon,
  Group,
  List,
  ThemeIcon,
  Paper,
  Tooltip,
} from "@mantine/core";
import styled from "styled-components";
import {
  MdClose,
  MdErrorOutline,
  MdLightbulbOutline,
  MdBugReport,
  MdAutoAwesome,
  MdOpenInFull,
  MdCloseFullscreen,
} from "react-icons/md";
import useAI from "../../../store/useAI";

// Expanded width = 600px, collapsed = 340px, closed = 0px
const PanelWrapper = styled.div<{ $open: boolean; $expanded: boolean }>`
  position: absolute;
  top: 0;
  right: 0;
  width: ${({ $open, $expanded }) => (!$open ? "0px" : $expanded ? "600px" : "340px")};
  height: 100%;
  overflow: hidden;
  transition: width 0.25s ease;
  z-index: 30;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.BACKGROUND_SECONDARY};
  border-left: 1px solid ${({ theme }) => theme.SILVER_DARK};
  box-shadow: ${({ $open }) => ($open ? "-4px 0 16px rgba(0,0,0,0.12)" : "none")};
`;

const PanelInner = styled.div<{ $expanded: boolean }>`
  width: ${({ $expanded }) => ($expanded ? "600px" : "340px")};
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const InsightsPanel = () => {
  const insights = useAI(state => state.insights);
  const loading = useAI(state => state.loading);
  const error = useAI(state => state.error);
  const panelOpen = useAI(state => state.panelOpen);
  const setPanelOpen = useAI(state => state.setPanelOpen);

  const [expanded, setExpanded] = React.useState(false);

  const isVisible = panelOpen && (loading || !!insights || !!error);

  return (
    <PanelWrapper $open={isVisible} $expanded={expanded}>
      <PanelInner $expanded={expanded}>
        {/* Header */}
        <Group
          px="md"
          py="xs"
          justify="space-between"
          style={{ borderBottom: "1px solid var(--mantine-color-default-border)", flexShrink: 0 }}
        >
          <Group gap={6}>
            <MdAutoAwesome size={16} color="#818cf8" />
            <Text size="sm" fw={600} style={{ color: "#818cf8" }}>
              AI Insights
            </Text>
            <Badge size="xs" color="violet" variant="light">
              Gemini
            </Badge>
          </Group>
          <Group gap={4}>
            <Tooltip label={expanded ? "Collapse panel" : "Expand panel"} withArrow>
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={() => setExpanded(e => !e)}
                title={expanded ? "Collapse" : "Expand"}
              >
                {expanded ? <MdCloseFullscreen size={14} /> : <MdOpenInFull size={14} />}
              </ActionIcon>
            </Tooltip>
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={() => {
                setPanelOpen(false);
                setExpanded(false);
              }}
              title="Close panel"
            >
              <MdClose size={14} />
            </ActionIcon>
          </Group>
        </Group>

        <ScrollArea flex={1} p="md">
          <Stack gap="md">
            {/* Loading State */}
            {loading && (
              <Stack gap="sm">
                <Skeleton height={12} radius="xl" />
                <Skeleton height={12} radius="xl" width="80%" />
                <Skeleton height={12} radius="xl" width="60%" />
                <Skeleton height={8} radius="xl" mt={8} />
                <Skeleton height={8} radius="xl" width="75%" />
                <Skeleton height={8} radius="xl" width="55%" />
              </Stack>
            )}

            {/* Error State */}
            {!loading && error && (
              <Alert icon={<MdErrorOutline size={16} />} color="red" variant="light" title="Error">
                {error}
              </Alert>
            )}

            {/* Results */}
            {!loading && insights && (
              <>
                <Paper p="sm" radius="md" withBorder>
                  <Group gap={6} mb={6}>
                    <MdAutoAwesome size={14} color="#818cf8" />
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                      Summary
                    </Text>
                  </Group>
                  <Text size="sm" lh={1.6}>
                    {insights.summary}
                  </Text>
                </Paper>

                {insights.anomalies.length > 0 && (
                  <Paper p="sm" radius="md" withBorder>
                    <Group gap={6} mb={8}>
                      <MdBugReport size={14} color="#f97316" />
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                        Anomalies
                      </Text>
                      <Badge size="xs" color="orange" variant="light">
                        {insights.anomalies.length}
                      </Badge>
                    </Group>
                    <List size="sm" spacing={4}>
                      {insights.anomalies.map((anomaly, i) => (
                        <List.Item
                          key={i}
                          icon={
                            <ThemeIcon size={16} color="orange" variant="light" radius="xl">
                              <MdBugReport size={10} />
                            </ThemeIcon>
                          }
                        >
                          {anomaly}
                        </List.Item>
                      ))}
                    </List>
                  </Paper>
                )}

                {insights.insights.length > 0 && (
                  <Paper p="sm" radius="md" withBorder>
                    <Group gap={6} mb={8}>
                      <MdLightbulbOutline size={14} color="#eab308" />
                      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                        Insights
                      </Text>
                      <Badge size="xs" color="yellow" variant="light">
                        {insights.insights.length}
                      </Badge>
                    </Group>
                    <List size="sm" spacing={4}>
                      {insights.insights.map((insight, i) => (
                        <List.Item
                          key={i}
                          icon={
                            <ThemeIcon size={16} color="yellow" variant="light" radius="xl">
                              <MdLightbulbOutline size={10} />
                            </ThemeIcon>
                          }
                        >
                          {insight}
                        </List.Item>
                      ))}
                    </List>
                  </Paper>
                )}
              </>
            )}

            {/* Empty State */}
            {!loading && !insights && !error && (
              <Stack align="center" gap="xs" py="xl">
                <MdAutoAwesome size={32} color="#818cf8" opacity={0.4} />
                <Text size="sm" c="dimmed" ta="center">
                  Click &ldquo;Explain Data&rdquo; to generate AI insights about your dataset.
                </Text>
              </Stack>
            )}
          </Stack>
        </ScrollArea>
      </PanelInner>
    </PanelWrapper>
  );
};
