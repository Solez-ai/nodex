import React from "react";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { createTheme, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/code-highlight/styles.css";
import { ThemeProvider } from "styled-components";
import { NextSeo } from "next-seo";
import { Toaster } from "react-hot-toast";
import GlobalStyle from "../constants/globalStyle";
import { SEO } from "../constants/seo";
import { lightTheme } from "../constants/theme";
import { smartColorSchemeManager } from "../lib/utils/mantineColorScheme";

const theme = createTheme({
  autoContrast: true,
  fontSmoothing: false,
  respectReducedMotion: true,
  cursorType: "pointer",
  fontFamily:
    'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"',
  defaultGradient: {
    from: "#388cdb",
    to: "#0f037f",
    deg: 180,
  },
  primaryShade: 8,
  colors: {
    brightBlue: [
      "#e6f2ff",
      "#cee1ff",
      "#9bc0ff",
      "#649dff",
      "#3980fe",
      "#1d6dfe",
      "#0964ff",
      "#0054e4",
      "#004acc",
      "#003fb5",
    ],
  },
  radius: {
    lg: "12px",
  },
  components: {
    Button: {
      defaultProps: {
        fw: 500,
      },
    },
  },
});

function NodexApp({ Component, pageProps }: AppProps) {
  const { pathname } = useRouter();

  // Create a single smart manager that handles pathname logic internally
  const colorSchemeManager = smartColorSchemeManager({
    key: "nodex-color-scheme",
    getPathname: () => pathname,
    dynamicPaths: ["/"], // Main app uses dynamic theme
  });

  return (
    <>
      <NextSeo {...SEO} />
      <MantineProvider
        colorSchemeManager={colorSchemeManager}
        defaultColorScheme="light"
        theme={theme}
      >
        <ThemeProvider theme={lightTheme}>
          <Toaster
            position="bottom-right"
            containerStyle={{
              bottom: 34,
              right: 8,
              fontSize: 14,
            }}
            toastOptions={{
              style: {
                background: "#4D4D4D",
                color: "#B9BBBE",
                borderRadius: 4,
              },
            }}
          />
          <GlobalStyle />
          <Component {...pageProps} />
        </ThemeProvider>
      </MantineProvider>
    </>
  );
}

export default NodexApp;
