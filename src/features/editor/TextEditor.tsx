import React from "react";
import dynamic from "next/dynamic";
import { LoadingOverlay } from "@mantine/core";
import styled from "styled-components";
import { json as jsonLang } from "@codemirror/lang-json";
import { xml as xmlLang } from "@codemirror/lang-xml";
import { yaml as yamlLang } from "@codemirror/lang-yaml";
import type { Extension } from "@codemirror/state";
import loader from "@monaco-editor/loader";
import type { ReactCodeMirrorProps } from "@uiw/react-codemirror";
import { FileFormat } from "../../enums/file.enum";
import useConfig from "../../store/useConfig";
import useFile from "../../store/useFile";

const LiteCodeEditor = dynamic<ReactCodeMirrorProps>(
  () => import("@uiw/react-codemirror").then(mod => mod.default),
  { ssr: false }
);

const editorOptions = {
  formatOnPaste: true,
  tabSize: 2,
  formatOnType: true,
  minimap: { enabled: false },
  stickyScroll: { enabled: false },
  scrollBeyondLastLine: false,
};

const LOCAL_MONACO_VS = "/monaco-editor/min/vs";
const CDN_MONACO_VS = "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs";

const toMonacoLanguage = (format: FileFormat): string => {
  if (format === FileFormat.JSON) return "json";
  if (format === FileFormat.YAML) return "yaml";
  if (format === FileFormat.XML) return "xml";
  if (format === FileFormat.TOML) return "toml";
  return "plaintext";
};

const toLiteExtensions = (format: FileFormat): Extension[] => {
  if (format === FileFormat.JSON) return [jsonLang()];
  if (format === FileFormat.YAML || format === FileFormat.TOML) return [yamlLang()];
  if (format === FileFormat.XML) return [xmlLang()];
  return [];
};

const joinWithPrefix = (prefix: string, suffix: string) => {
  const normalizedPrefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  if (!normalizedPrefix) return suffix;
  return `${normalizedPrefix}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
};

const getLocalMonacoVsPath = () => {
  if (typeof window === "undefined") return LOCAL_MONACO_VS;
  const nextData = (window as Window & { __NEXT_DATA__?: { assetPrefix?: string } }).__NEXT_DATA__;
  const assetPrefix = typeof nextData?.assetPrefix === "string" ? nextData.assetPrefix : "";
  return joinWithPrefix(assetPrefix, LOCAL_MONACO_VS);
};

const hasLoaderScript = async (vsPath: string) => {
  try {
    const response = await fetch(`${vsPath}/loader.js`, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
};

const normalizeMonacoInstance = (instance: any) => {
  if (instance?.editor) return instance;
  if (instance?.m?.editor) return instance.m;
  if (instance?.default?.editor) return instance.default;
  if (instance?.default?.m?.editor) return instance.default.m;
  return null;
};

const configureJsonDiagnostics = (monaco: any, jsonSchema: object | null) => {
  const jsonDefaults = monaco?.languages?.json?.jsonDefaults;
  if (!jsonDefaults) return;

  try {
    jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: true,
      enableSchemaRequest: true,
      ...(jsonSchema && {
        schemas: [
          {
            uri: "http://myserver/foo-schema.json",
            fileMatch: ["*"],
            schema: jsonSchema,
          },
        ],
      }),
    });
  } catch (error) {
    console.warn("Failed to configure Monaco JSON diagnostics", error);
  }
};

const TextEditor = () => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const monacoRef = React.useRef<any>(null);
  const editorRef = React.useRef<any>(null);
  const disposablesRef = React.useRef<any[]>([]);
  const applyingExternalUpdate = React.useRef(false);
  const fallbackForcedRef = React.useRef(false);

  const contents = useFile(state => state.contents);
  const setContents = useFile(state => state.setContents);
  const setError = useFile(state => state.setError);
  const jsonSchema = useFile(state => state.jsonSchema);
  const getHasChanges = useFile(state => state.getHasChanges);
  const theme = useConfig(state => (state.darkmodeEnabled ? "vs-dark" : "light"));
  const fileType = useFile(state => state.format);

  const [isLoading, setIsLoading] = React.useState(true);
  const [useLiteEditor, setUseLiteEditor] = React.useState(false);
  const liteExtensions = React.useMemo(() => toLiteExtensions(fileType), [fileType]);

  const initializeMonaco = React.useCallback(async () => {
    const localVs = getLocalMonacoVsPath();
    const useLocalBundle = await hasLoaderScript(localVs);

    if (!useLocalBundle) {
      console.warn("Local Monaco bundle unavailable, using CDN loader path");
    }

    loader.config({ paths: { vs: useLocalBundle ? localVs : CDN_MONACO_VS } });

    const rawMonaco = await loader.init();
    const monaco = normalizeMonacoInstance(rawMonaco);

    if (!monaco?.editor?.create || !monaco?.editor?.createModel) {
      throw new Error("Monaco editor API unavailable (missing editor.create/createModel)");
    }

    return monaco;
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const timeout = window.setTimeout(() => {
      if (!cancelled && !editorRef.current) {
        fallbackForcedRef.current = true;
        console.warn("Monaco Editor taking too long to load, switching to lightweight editor");
        setError("Monaco initialization timed out. Switched to lightweight editor.");
        setUseLiteEditor(true);
        setIsLoading(false);
      }
    }, 6000);

    const init = async () => {
      try {
        const monaco = await initializeMonaco();
        if (cancelled || fallbackForcedRef.current || !containerRef.current) return;

        monacoRef.current = monaco;

        const language = toMonacoLanguage(fileType);
        const model = monaco.editor.createModel(contents ?? "", language);
        const editor = monaco.editor.create(containerRef.current, {
          model,
          automaticLayout: true,
          ...editorOptions,
        });

        editorRef.current = editor;
        monaco.editor.setTheme(theme);
        configureJsonDiagnostics(monaco, jsonSchema);

        disposablesRef.current.push(
          editor.onDidChangeModelContent(() => {
            if (applyingExternalUpdate.current) return;
            setContents({ contents: editor.getValue(), skipUpdate: true });
          })
        );

        disposablesRef.current.push(
          editor.onDidPaste(() => {
            editor.getAction("editor.action.formatDocument")?.run();
          })
        );

        disposablesRef.current.push(
          monaco.editor.onDidChangeMarkers((resources: any[]) => {
            const modelUri = model.uri?.toString();
            if (!modelUri || !resources.some(resource => resource?.toString?.() === modelUri))
              return;
            const markers = monaco.editor.getModelMarkers({ resource: model.uri });
            setError(markers[0]?.message ?? null);
          })
        );

        setError(null);
        setIsLoading(false);
        setUseLiteEditor(false);
      } catch (error) {
        console.error("Monaco failed to initialize", error);
        setError("Monaco failed to initialize. Switched to lightweight editor.");
        setUseLiteEditor(true);
        setIsLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);

      disposablesRef.current.forEach(disposable => disposable?.dispose?.());
      disposablesRef.current = [];

      const editor = editorRef.current;
      if (editor) {
        const model = editor.getModel?.();
        editor.dispose?.();
        model?.dispose?.();
      }

      editorRef.current = null;
      monacoRef.current = null;
    };
    // Intentionally run once for stable editor lifecycle; reactive updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const editor = editorRef.current;
    if (!editor || typeof contents !== "string") return;
    if (editor.getValue() === contents) return;

    applyingExternalUpdate.current = true;
    try {
      const model = editor.getModel?.();
      if (!model) {
        editor.setValue(contents);
      } else {
        editor.executeEdits("external-update", [
          {
            range: model.getFullModelRange(),
            text: contents,
            forceMoveMarkers: true,
          },
        ]);
        editor.pushUndoStop();
      }
    } finally {
      applyingExternalUpdate.current = false;
    }
  }, [contents]);

  React.useEffect(() => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    const model = editor?.getModel?.();
    if (!monaco || !model) return;

    try {
      monaco.editor.setModelLanguage(model, toMonacoLanguage(fileType));
    } catch (error) {
      console.warn("Failed to set Monaco language", error);
    }
  }, [fileType]);

  React.useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    try {
      monaco.editor.setTheme(theme);
    } catch (error) {
      console.warn("Failed to set Monaco theme", error);
    }
  }, [theme]);

  React.useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    configureJsonDiagnostics(monaco, jsonSchema);
  }, [jsonSchema]);

  React.useEffect(() => {
    const beforeunload = (e: BeforeUnloadEvent) => {
      if (getHasChanges()) {
        const confirmationMessage =
          "Unsaved changes, if you leave before saving your changes will be lost";
        (e || window.event).returnValue = confirmationMessage;
        return confirmationMessage;
      }
    };

    window.addEventListener("beforeunload", beforeunload);
    return () => window.removeEventListener("beforeunload", beforeunload);
  }, [getHasChanges]);

  if (useLiteEditor) {
    return (
      <StyledEditorWrapper>
        <StyledWrapper>
          <LiteBanner>CodeMirror Fallback (Monaco unavailable)</LiteBanner>
          <StyledLiteWrapper>
            <LiteCodeEditor
              value={contents ?? ""}
              height="100%"
              theme={theme === "vs-dark" ? "dark" : "light"}
              extensions={liteExtensions}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLine: true,
                highlightActiveLineGutter: true,
                foldGutter: true,
                autocompletion: true,
              }}
              onChange={value => setContents({ contents: value, skipUpdate: true })}
            />
          </StyledLiteWrapper>
        </StyledWrapper>
      </StyledEditorWrapper>
    );
  }

  return (
    <StyledEditorWrapper>
      <StyledWrapper>
        <LoadingOverlay visible={isLoading} />
        <StyledMonacoHost
          ref={containerRef}
          className="sentry-mask"
          data-sentry-mask="true"
          aria-label="Editor"
        />
      </StyledWrapper>
    </StyledEditorWrapper>
  );
};

export default TextEditor;

const StyledEditorWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  user-select: none;
`;

const StyledWrapper = styled.div`
  display: grid;
  position: relative;
  height: calc(100vh - 67px);
  grid-template-columns: 100%;
  grid-template-rows: minmax(0, 1fr);
`;

const StyledMonacoHost = styled.div`
  width: 100%;
  height: 100%;
`;

const LiteBanner = styled.div`
  position: absolute;
  top: 8px;
  right: 10px;
  z-index: 2;
  font-size: 11px;
  font-family: monospace;
  color: #9ca3af;
`;

const StyledLiteWrapper = styled.div`
  width: 100%;
  height: 100%;

  .cm-theme,
  .cm-editor {
    height: 100%;
  }

  .cm-scroller {
    overflow: auto;
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
      monospace;
  }
`;
