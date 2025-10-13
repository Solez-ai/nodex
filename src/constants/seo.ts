import type { NextSeoProps } from "next-seo";

export const SEO: NextSeoProps = {
  title: "Nodex | Interactive Data Visualizer - Visualize JSON, YAML, CSV & XML",
  description:
    "Nodex is a powerful data visualization tool for transforming JSON, YAML, CSV, and XML data into interactive graphs and trees. Explore, analyze, and understand your structured data visually.",
  themeColor: "#36393E",
  openGraph: {
    type: "website",
    images: [
      {
        url: "/assets/nodex_logo.png",
        width: 1200,
        height: 627,
      },
    ],
  },
  twitter: {
    handle: "@Solez_None",
    cardType: "summary_large_image",
  },
  additionalLinkTags: [
    {
      rel: "manifest",
      href: "/manifest.json",
    },
    {
      rel: "icon",
      href: "/favicon.ico",
      sizes: "48x48",
    },
  ],
};
