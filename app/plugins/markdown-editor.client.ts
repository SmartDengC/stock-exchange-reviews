import { config, XSSPlugin } from "md-editor-v3";

export default defineNuxtPlugin(() => {
  config({
    markdownItPlugins(plugins) {
      return [
        ...plugins,
        {
          type: "xss",
          plugin: XSSPlugin,
          options: {},
        },
      ];
    },
  });
});
