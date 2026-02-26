import React, { useCallback } from "react";
import { LoadingOverlay } from "@mantine/core";
import styled from "styled-components";
import Editor, { type EditorProps, loader, type OnMount, useMonaco } from "@monaco-editor/react";
import useConfig from "../../store/useConfig";
import useFile from "../../store/useFile";

loader.config({
  paths: {
    vs: "/monaco-editor/min/vs",
  },
});

const editorOptions: EditorProps["options"] = {
  formatOnPaste: true,
  tabSize: 2,
  formatOnType: true,
  minimap: { enabled: false },
  stickyScroll: { enabled: false },
  scrollBeyondLastLine: false,
  placeholder: "Start typing...",
};

const TextEditor = () => {
  const monaco = useMonaco();
  const contents = useFile(state => state.contents);
  const setContents = useFile(state => state.setContents);
  const setError = useFile(state => state.setError);
  const jsonSchema = useFile(state => state.jsonSchema);
  const getHasChanges = useFile(state => state.getHasChanges);
  const theme = useConfig(state => (state.darkmodeEnabled ? "vs-dark" : "light"));
  const fileType = useFile(state => state.format);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  // Add timeout for Monaco Editor loading
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn("Monaco Editor taking too long to load, showing fallback");
        setHasError(true);
        setIsLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [isLoading]);

  React.useEffect(() => {
    monaco?.languages.json.jsonDefaults.setDiagnosticsOptions({
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
  }, [jsonSchema, monaco?.languages.json.jsonDefaults]);

  React.useEffect(() => {
    const beforeunload = (e: BeforeUnloadEvent) => {
      if (getHasChanges()) {
        const confirmationMessage =
          "Unsaved changes, if you leave before saving your changes will be lost";
        (e || window.event).returnValue = confirmationMessage; // Gecko + IE
        return confirmationMessage;
      }
    };

    window.addEventListener("beforeunload", beforeunload);
    return () => window.removeEventListener("beforeunload", beforeunload);
  }, [getHasChanges]);

  const handleMount: OnMount = useCallback(editor => {
    setIsLoading(false);
    setHasError(false);
    editor.onDidPaste(() => {
      editor.getAction("editor.action.formatDocument")?.run();
    });
  }, []);

  const handleError = React.useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  // Safely render editor with try/catch
  let editorContent;
  try {
    editorContent = (
      <Editor
        className="sentry-mask"
        data-sentry-mask="true"
        height="100%"
        language={fileType}
        theme={theme}
        value={contents}
        options={editorOptions}
        onMount={handleMount}
        onValidate={errors => setError(errors[0]?.message || "")}
        onChange={contents => setContents({ contents, skipUpdate: true })}
        loading={<LoadingOverlay visible={isLoading} />}
      />
    );
  } catch (error) {
    console.error("Editor failed to render:", error);
    handleError();
    editorContent = (
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
    );
  }

  // Fallback textarea if Monaco Editor fails to load
  if (hasError) {
    return (
      <StyledEditorWrapper>
        <StyledWrapper>{editorContent}</StyledWrapper>
      </StyledEditorWrapper>
    );
  }

  return (
    <StyledEditorWrapper>
      <StyledWrapper>{editorContent}</StyledWrapper>
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
  height: calc(100vh - 67px);
  grid-template-columns: 100%;
  grid-template-rows: minmax(0, 1fr);
`;
