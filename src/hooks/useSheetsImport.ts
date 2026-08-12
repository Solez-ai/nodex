import { useEffect } from "react";
import { FileFormat } from "../enums/file.enum";
import useFile from "../store/useFile";

/**
 * Protocol shared with the "Nodex for Google Sheets" add-on sidebar
 * (google-sheets-addon/Sidebar.html). Messages:
 *
 *   sender ──{ type:"nodex-sheets", status:"ping" }──▶ app
 *   app    ──{ type:"nodex-sheets", status:"ready" }──▶ sender
 *   sender ──{ type:"nodex-sheets", csv:"..." }───────▶ app   (import)
 *   app    ──{ type:"nodex-sheets", status:"loaded" }─▶ sender (ack)
 */
const PROTOCOL = "nodex-sheets";

interface SheetsMessage {
  type?: unknown;
  status?: unknown;
  csv?: unknown;
}

/**
 * Listens for CSV data posted from the add-on sidebar (which opens this app via
 * window.open). Using postMessage instead of a URL parameter removes any
 * URL-length limit, so arbitrarily large selections can be handed over.
 *
 * Security: replies are only posted back to the message sender's origin; the
 * sidebar only sends to the configured Nodex origin (see Sidebar.html).
 */
const useSheetsImport = () => {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as SheetsMessage | null;
      if (!data || typeof data !== "object" || data.type !== PROTOCOL) return;

      // Handshake: tell the sender we're listening so it can send the CSV.
      if (data.status === "ping") {
        const source = event.source as Window | null;
        source?.postMessage({ type: PROTOCOL, status: "ready" }, event.origin);
        return;
      }

      // CSV import: load the selection into the editor and graph. Ack only
      // after the import was attempted so the sidebar's toast reflects reality.
      if (typeof data.csv === "string" && data.csv) {
        const importPromise = useFile
          .getState()
          .setContents({ contents: data.csv, format: FileFormat.CSV, hasChanges: false });
        importPromise?.then(() => {
          const source = event.source as Window | null;
          source?.postMessage({ type: PROTOCOL, status: "loaded" }, event.origin);
        });
      }
    };

    window.addEventListener("message", handleMessage);

    // If this tab was opened from the sidebar, announce readiness so the
    // sidebar can send without having to ping first. (Contains no data.)
    let attempts = 0;
    const interval = window.setInterval(() => {
      if (window.opener) {
        window.opener.postMessage({ type: PROTOCOL, status: "ready" }, "*");
      }
      attempts += 1;
      if (attempts >= 8) window.clearInterval(interval);
    }, 800);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.clearInterval(interval);
    };
  }, []);
};

export default useSheetsImport;
