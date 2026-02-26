import React from "react";
import { Button, Stack, Text, Title } from "@mantine/core";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ClientErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ClientErrorBoundary caught an error:", error, info);
  }

  private reload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <Stack mt={100} justify="center" align="center">
          <Title fz={80} style={{ fontFamily: "monospace" }}>
            Oops
          </Title>
          <Title order={2}>Client runtime error detected</Title>
          <Text c="dimmed" maw={800} ta="center">
            Nodex recovered safely from a rendering error. Reload to continue.
          </Text>
          <Button size="lg" color="gray" onClick={this.reload}>
            Reload App
          </Button>
        </Stack>
      );
    }

    return this.props.children;
  }
}
