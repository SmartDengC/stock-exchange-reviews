import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt(
  {
    ignores: [".agents/**", ".idea/**"],
  },
  {
    rules: {
      "vue/multi-word-component-names": "off",
    },
  },
);
