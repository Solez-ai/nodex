import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Textarea,
  Button,
  Group,
  Text,
  Badge,
  SimpleGrid,
  Paper,
  Alert,
  Divider,
  ScrollArea,
  Tabs,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  MdSwapHoriz,
  MdCompareArrows,
  MdAdd,
  MdRemove,
  MdEdit,
  MdDataObject,
} from "react-icons/md";
import { computeDiff, type DiffResult } from "../../../lib/diff/jsonDiff";
import useDiff from "../../../store/useDiff";
import useFile from "../../../store/useFile";

export const DiffModal = ({ opened, onClose }: ModalProps) => {
  const activate = useDiff(state => state.activate);
  const getContents = useFile(state => state.getContents);
  const getFormat = useFile(state => state.getFormat);

  const [activeTab, setActiveTab] = React.useState<string | null>("paste");
  const [versionA, setVersionA] = React.useState("");
  const [versionB, setVersionB] = React.useState("");
  const [previewResult, setPreviewResult] = React.useState<DiffResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // When modal opens, offer to pre-fill Version A from the current editor
  const handleUseEditorContent = (slot: "A" | "B") => {
    const format = getFormat();
    if (format !== "json") {
      setError(
        `Diff currently only supports JSON. Your editor contains ${format.toUpperCase()} — please convert it first.`
      );
      return;
    }
    const content = getContents();
    if (slot === "A") {
      setVersionA(content);
    } else {
      setVersionB(content);
    }
    setPreviewResult(null);
    setError(null);
  };

  const handleCompare = () => {
    setError(null);
    setPreviewResult(null);
    try {
      const parsedA = JSON.parse(versionA);
      const parsedB = JSON.parse(versionB);
      const result = computeDiff(parsedA, parsedB);
      setPreviewResult(result);
    } catch {
      setError("Invalid JSON in one or both versions. Please check your input.");
    }
  };

  const handleActivate = () => {
    if (!previewResult) return;
    activate(versionA, versionB, previewResult);
    onClose();
  };

  const handleSwap = () => {
    const nextA = versionB;
    const nextB = versionA;
    setVersionA(nextA);
    setVersionB(nextB);
    setPreviewResult(null);
    setError(null);
  };

  const handleClose = () => {
    setError(null);
    setPreviewResult(null);
    onClose();
  };

  const countsByStatus = React.useMemo(() => {
    if (!previewResult) return null;
    const counts = { added: 0, removed: 0, modified: 0 };
    Object.values(previewResult.byPath).forEach(status => {
      if (status in counts) counts[status as keyof typeof counts]++;
    });
    return counts;
  }, [previewResult]);

  const VersionSlot = ({
    label,
    value,
    onChange,
    slot,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    slot: "A" | "B";
    placeholder: string;
  }) => (
    <Stack gap={6}>
      <Group justify="space-between" align="center">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase">
          {label}
        </Text>
        <Tooltip label="Load from current editor" withArrow position="top">
          <ActionIcon
            size="xs"
            variant="subtle"
            color="blue"
            onClick={() => handleUseEditorContent(slot)}
            title="Use current editor content"
          >
            <MdDataObject size={13} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Textarea
        placeholder={placeholder}
        minRows={12}
        maxRows={16}
        autosize
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setPreviewResult(null);
          setError(null);
        }}
        styles={{ input: { fontFamily: "monospace", fontSize: 12 } }}
      />
    </Stack>
  );

  return (
    <Modal
      title={
        <Group gap="xs">
          <MdCompareArrows size={18} />
          <Text fw={600}>Compare / Diff View</Text>
          <Badge size="sm" color="blue" variant="light">
            JSON
          </Badge>
        </Group>
      }
      opened={opened}
      onClose={handleClose}
      size="xl"
      centered
    >
      <Stack gap="md">
        {/* Quick-load banner */}
        <Alert color="blue" variant="light" p="xs">
          <Group gap={6}>
            <MdDataObject size={14} />
            <Text size="xs">
              Click the{" "}
              <Text component="span" fw={700} size="xs">
                editor icon
              </Text>{" "}
              next to each version label to load your current editor content directly — no
              copy-paste needed.
            </Text>
          </Group>
        </Alert>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List mb="sm">
            <Tabs.Tab value="paste">Side-by-Side Editor</Tabs.Tab>
            <Tabs.Tab value="results" disabled={!previewResult}>
              Diff Results{" "}
              {countsByStatus
                ? `(${countsByStatus.added + countsByStatus.removed + countsByStatus.modified} changes)`
                : ""}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="paste">
            <SimpleGrid cols={2} spacing="sm">
              <VersionSlot
                label="Version A — Original"
                value={versionA}
                onChange={setVersionA}
                slot="A"
                placeholder={'{"version": "1.0", ...}'}
              />
              <VersionSlot
                label="Version B — New"
                value={versionB}
                onChange={setVersionB}
                slot="B"
                placeholder={'{"version": "2.0", ...}'}
              />
            </SimpleGrid>
          </Tabs.Panel>

          <Tabs.Panel value="results">
            {countsByStatus && (
              <Stack gap="md">
                <SimpleGrid cols={3} spacing="sm">
                  <Paper p="sm" radius="md" withBorder style={{ borderColor: "#22c55e" }}>
                    <Group gap={6}>
                      <MdAdd size={16} color="#22c55e" />
                      <Text size="sm" fw={600} c="green">
                        {countsByStatus.added} Added
                      </Text>
                    </Group>
                  </Paper>
                  <Paper p="sm" radius="md" withBorder style={{ borderColor: "#ef4444" }}>
                    <Group gap={6}>
                      <MdRemove size={16} color="#ef4444" />
                      <Text size="sm" fw={600} c="red">
                        {countsByStatus.removed} Removed
                      </Text>
                    </Group>
                  </Paper>
                  <Paper p="sm" radius="md" withBorder style={{ borderColor: "#f59e0b" }}>
                    <Group gap={6}>
                      <MdEdit size={16} color="#f59e0b" />
                      <Text size="sm" fw={600} c="yellow">
                        {countsByStatus.modified} Modified
                      </Text>
                    </Group>
                  </Paper>
                </SimpleGrid>

                <ScrollArea h={200}>
                  <Stack gap={2}>
                    {Object.entries(previewResult!.byPath)
                      .filter(([, s]) => s !== "unchanged")
                      .slice(0, 100)
                      .map(([path, status]) => (
                        <Group key={path} gap={6}>
                          <Badge
                            size="xs"
                            color={
                              status === "added" ? "green" : status === "removed" ? "red" : "yellow"
                            }
                            variant="light"
                          >
                            {status}
                          </Badge>
                          <Text
                            size="xs"
                            ff="monospace"
                            c="dimmed"
                            style={{ wordBreak: "break-all" }}
                          >
                            {path}
                          </Text>
                        </Group>
                      ))}
                  </Stack>
                </ScrollArea>
              </Stack>
            )}
          </Tabs.Panel>
        </Tabs>

        {error && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}

        <Divider />

        <Group justify="space-between">
          <Button
            leftSection={<MdSwapHoriz size={16} />}
            variant="subtle"
            size="sm"
            onClick={handleSwap}
            disabled={!versionA && !versionB}
          >
            Swap A / B
          </Button>
          <Group gap="xs">
            <Button variant="default" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            {!previewResult ? (
              <Button
                size="sm"
                leftSection={<MdCompareArrows size={16} />}
                onClick={handleCompare}
                disabled={!versionA.trim() || !versionB.trim()}
              >
                Compare
              </Button>
            ) : (
              <Button size="sm" color="blue" onClick={handleActivate}>
                View in Graph
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};
