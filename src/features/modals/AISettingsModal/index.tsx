import React from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, TextInput, Button, Group, Text, Badge, Alert, Anchor } from "@mantine/core";
import { MdKey, MdCheckCircle, MdInfo } from "react-icons/md";
import useAI from "../../../store/useAI";

export const AISettingsModal = ({ opened, onClose }: ModalProps) => {
  const apiKey = useAI(state => state.apiKey);
  const setApiKey = useAI(state => state.setApiKey);
  const removeApiKey = useAI(state => state.removeApiKey);

  // Load from localStorage on mount
  React.useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("nodex_gemini_api_key") : null;
    if (stored && !apiKey) setApiKey(stored);
  }, [apiKey, setApiKey]);

  const [inputValue, setInputValue] = React.useState("");
  const [saved, setSaved] = React.useState(false);

  const handleSave = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setApiKey(trimmed);
    setInputValue("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleRemove = () => {
    removeApiKey();
    setInputValue("");
  };

  return (
    <Modal
      title="AI Settings — Gemini API Key"
      opened={opened}
      onClose={onClose}
      centered
      size="md"
    >
      <Stack py="sm" gap="md">
        <Alert icon={<MdInfo size={16} />} color="blue" variant="light">
          Your API key is stored <strong>only in your browser&apos;s localStorage</strong> and never
          sent to any Nodex server. It is used exclusively for direct calls to Google&apos;s Gemini
          API.
        </Alert>

        {apiKey ? (
          <Group align="center" gap="xs">
            <MdCheckCircle size={18} color="#22c55e" />
            <Text size="sm" fw={500}>
              API key is set
            </Text>
            <Badge color="green" variant="light" size="sm">
              Active
            </Badge>
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            No API key configured yet.
          </Text>
        )}

        <TextInput
          label="Gemini API Key"
          description="Get your key at Google AI Studio"
          placeholder="AIza..."
          type="password"
          leftSection={<MdKey size={16} />}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSave()}
        />

        <Text size="xs" c="dimmed">
          <Anchor href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">
            aistudio.google.com/app/apikey
          </Anchor>
          {" — free tier available"}
        </Text>

        <Group justify="space-between">
          <Button variant="subtle" color="red" size="sm" disabled={!apiKey} onClick={handleRemove}>
            Remove Key
          </Button>
          <Group gap="xs">
            <Button variant="default" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!inputValue.trim()}
              onClick={handleSave}
              color={saved ? "green" : "blue"}
            >
              {saved ? "Saved!" : "Save Key"}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};
