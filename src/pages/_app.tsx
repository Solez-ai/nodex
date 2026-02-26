import React from "react";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { createTheme, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/code-highlight/styles.css";
import { ThemeProvider } from "styled-components";
import { NextSeo } from "next-seo";
import { Toaster } from "react-hot-toast";
import { ClientErrorBoundary } from "../components/ClientErrorBoundary";
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

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const RELOAD_KEY = "nodex-runtime-reload-once";
    const shouldRecover = (message: string) => {
      const lower = message.toLowerCase();
      return (
        lower.includes("reading 'json'") ||
        lower.includes('reading "json"') ||
        lower.includes("reading 'getmodel'") ||
        lower.includes('reading "getmodel"') ||
        lower.includes("chunkloaderror")
      );
    };

    const recoverOnce = () => {
      if (sessionStorage.getItem(RELOAD_KEY) === "1") return;
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      const message = event.error?.message ?? event.message ?? "";
      if (shouldRecover(message)) recoverOnce();
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === "string"
          ? reason
          : reason instanceof Error
            ? reason.message
            : JSON.stringify(reason ?? "");
      if (shouldRecover(message)) recoverOnce();
    };

    // Clear the reload guard after a stable startup window.
    const timeout = window.setTimeout(() => {
      sessionStorage.removeItem(RELOAD_KEY);
    }, 5000);

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

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
          <ClientErrorBoundary>
            <Component {...pageProps} />
          </ClientErrorBoundary>
        </ThemeProvider>
      </MantineProvider>
    </>
  );
}

export default NodexApp;
