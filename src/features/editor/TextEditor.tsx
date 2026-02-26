import React from "react";
import { LoadingOverlay } from "@mantine/core";
import styled from "styled-components";
import loader from "@monaco-editor/loader";
import { FileFormat } from "../../enums/file.enum";
import useConfig from "../../store/useConfig";
import useFile from "../../store/useFile";

loader.config({
  paths: {
    vs: "/monaco-editor/min/vs",
  },
});

const editorOptions = {
  formatOnPaste: true,
  tabSize: 2,
  formatOnType: true,
  minimap: { enabled: false },
  stickyScroll: { enabled: false },
  scrollBeyondLastLine: false,
};

const toMonacoLanguage = (format: FileFormat): string => {
  if (format === FileFormat.JSON) return "json";
  if (format === FileFormat.YAML) return "yaml";
  if (format === FileFormat.XML) return "xml";
  if (format === FileFormat.TOML) return "toml";
  if (format === FileFormat.CSV) return "plaintext";
  return "plaintext";
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

  const contents = useFile(state => state.contents);
  const setContents = useFile(state => state.setContents);
  const jsonSchema = useFile(state => state.jsonSchema);
  const getHasChanges = useFile(state => state.getHasChanges);
  const theme = useConfig(state => (state.darkmodeEnabled ? "vs-dark" : "light"));
  const fileType = useFile(state => state.format);

  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const timeout = window.setTimeout(() => {
      if (!cancelled && !editorRef.current) {
        console.warn("Monaco Editor taking too long to load, showing fallback");
        setHasError(true);
        setIsLoading(false);
      }
    }, 5000);

    const init = async () => {
      try {
        const monaco = await loader.init();
        if (cancelled || !containerRef.current) return;

        monacoRef.current = monaco;

        const language = toMonacoLanguage(fileType);
        const model = monaco.editor.createModel(contents ?? "", language);
        const editor = monaco.editor.create(
          containerRef.current,
          {
            model,
            automaticLayout: true,
            ...editorOptions,
          },
          {}
        );

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

        setIsLoading(false);
        setHasError(false);
      } catch (error) {
        console.error("Monaco failed to initialize", error);
        setHasError(true);
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
    // Intentionally run once for stable editor instance lifecycle.
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

  if (hasError) {
    return (
      <StyledEditorWrapper>
        <StyledWrapper>
          <textarea
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              outline: "none",
              fontFamily: "monospace",
              fontSize: "14px",
              padding: "10px",
              backgroundColor: theme === "vs-dark" ? "#1e1e1e" : "#ffffff",
              color: theme === "vs-dark" ? "#d4d4d4" : "#000000",
              resize: "none",
            }}
            value={contents}
            onChange={e => setContents({ contents: e.target.value, skipUpdate: true })}
            placeholder="Monaco Editor failed to load. Using fallback textarea..."
          />
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
