import globals from "globals";
import js from "@eslint/js";

export default [
  { ignores: ["dist/**", "legacy/**"] },
  js.configs.recommended,
  {
    files: ["audio.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "eqeqeq": "error",
      "curly": "error"
    }
  }
];
