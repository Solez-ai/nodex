import React from "react";
import { Button, Image, Overlay, Stack, Text } from "@mantine/core";
import styled, { keyframes } from "styled-components";
import useConfig from "../../../../store/useConfig";

const shineEffect = keyframes`
  0% {
    transform: translateX(-120%) rotate(25deg);
    opacity: 0.5;
  }
  5% {
    opacity: 0.5;
    transform: translateX(-80%) rotate(25deg);
  }
  70% {
    transform: translateX(80%) rotate(25deg);
    opacity: 0.5;
  }
  80% {
    transform: translateX(120%) rotate(25deg);
    opacity: 0;
  }
  100% {
    transform: translateX(120%) rotate(25deg);
    opacity: 0;
  }
`;

const ShiningButton = styled.div`
  position: relative;
  overflow: hidden;
  display: inline-block;
  border-radius: 0.5rem;
  z-index: 10;

  &::before {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      to right,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0) 35%,
      rgba(255, 255, 255, 0.5) 50%,
      rgba(255, 255, 255, 0) 65%,
      rgba(255, 255, 255, 0) 100%
    );
    transform: translateX(-120%) rotate(25deg);
    z-index: 20;
    pointer-events: none;
    animation: ${shineEffect} 4s ease-out infinite;
    transition: transform 0.2s ease-out;
  }
`;

export const NotSupported = () => {
  const darkmodeEnabled = useConfig(state => state.darkmodeEnabled);

  return (
    <Overlay
      backgroundOpacity={0.8}
      color={darkmodeEnabled ? "gray" : "rgb(226, 240, 243)"}
      blur="1.5"
      center
    >
      <Stack maw="60%" align="center" justify="center" gap="sm">
        <Image src="public/assets/192.png" alt="Too large diagram" w={72} h={72} />
        <Text fz="48" fw={600} c="bright">
          This diagram is too big
        </Text>
        <Text ta="center" size="lg" fw={500} c="gray" maw="600">
          Sorry! Your data is too large to render here.
          <br />
          Try simplifying or trimming down your JSON before loading it again.
        </Text>
        <ShiningButton style={{ marginTop: "16px", position: "relative" }}>
          <Button size="lg" w="200" color="teal" onClick={() => window.location.reload()}>
            Reload & Try Again ↻
          </Button>
        </ShiningButton>
      </Stack>
    </Overlay>
  );
};
