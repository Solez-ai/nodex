import React from "react";
import { useRouter } from "next/router";
import { Button, Stack, Text, Title } from "@mantine/core";
import { NextSeo } from "next-seo";
import { SEO } from "../constants/seo";

const Custom500 = () => {
  const router = useRouter();

  return (
    <>
      <NextSeo {...SEO} title="500 - Server Error | Nodex" noindex />
      <Stack mt={100} justify="center" align="center">
        <Title fz={150} style={{ fontFamily: "monospace" }}>
          500
        </Title>
        <Title order={2}>Something went wrong</Title>
        <Text c="dimmed" maw={800} style={{ textAlign: "center" }}>
          We&apos;re sorry, but something went wrong on our end. Please try again later or contact
          support if the problem persists.
        </Text>
        <Button size="lg" color="gray" onClick={() => router.reload()}>
          Try Again
        </Button>
      </Stack>
    </>
  );
};

export default Custom500;
