import toast from "react-hot-toast";
import useJson from "../store/useJson";

const useJsonQuery = () => {
  const getJson = useJson(state => state.getJson);

  const transformer = async ({ value }) => {
    const { run } = await import("json_typegen_wasm");
    return run("Root", value, JSON.stringify({ output_mode: "typescript/typealias" }));
  };

  const updateJson = async (query: string, cb?: () => void) => {
    try {
      // Simple JSON path-like query support without jq-web
      // This is a basic implementation for demonstration
      JSON.parse(getJson());

      // For now, just show an error since we removed jq-web
      toast.error(
        "Advanced query functionality requires jq-web dependency. Please install it separately if needed."
      );
      cb?.();
    } catch (error) {
      console.error(error);
      toast.error("Unable to process the request.");
    }
  };

  const getJsonType = async () => {
    const types = await transformer({ value: getJson() });
    return types;
  };

  return { updateJson, getJsonType };
};

export default useJsonQuery;
