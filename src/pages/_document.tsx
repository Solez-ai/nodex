import type { DocumentContext, DocumentInitialProps } from "next/document";
import Document, { Html, Head, Main, NextScript } from "next/document";
import { ColorSchemeScript } from "@mantine/core";
import { ServerStyleSheet } from "styled-components";

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps> {
    const sheet = new ServerStyleSheet();
    const originalRenderPage = ctx.renderPage;

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: App => props => sheet.collectStyles(<App {...props} />),
        });

      const initialProps = await Document.getInitialProps(ctx);

      return {
        ...initialProps,
        styles: (
          <>
            {initialProps.styles}
            {sheet.getStyleElement()}
          </>
        ),
      };
    } finally {
      sheet.seal();
    }
  }

  render() {
    return (
      <Html lang="en">
        <Head>
          <ColorSchemeScript />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function () {
                  if (typeof window === "undefined") return;
                  var RELOAD_KEY = "nodex-next-static-reload-once";

                  window.addEventListener(
                    "error",
                    function (event) {
                      var target = event && event.target;
                      if (!target) return;
                      var src = target.src || target.href || "";
                      if (typeof src !== "string" || src.indexOf("/_next/static/") === -1) return;

                      try {
                        if (sessionStorage.getItem(RELOAD_KEY) === "1") return;
                        sessionStorage.setItem(RELOAD_KEY, "1");
                        var url = new URL(window.location.href);
                        url.searchParams.set("__next_chunk_reload", String(Date.now()));
                        window.location.replace(url.toString());
                      } catch (_error) {
                        window.location.reload();
                      }
                    },
                    true
                  );

                  window.addEventListener("load", function () {
                    setTimeout(function () {
                      try {
                        sessionStorage.removeItem(RELOAD_KEY);
                      } catch (_error) {}
                    }, 5000);
                  });
                })();
              `,
            }}
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
