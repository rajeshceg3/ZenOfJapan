import globals from "globals";
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module", // Assuming audio.js is a module. If not, this might need adjustment.
                           // The previous .eslintrc.json had sourceType: "module"
                           // but audio.js is not written as an ES module (no import/export).
                           // Let's change to "commonjs" or remove sourceType if script is global.
                           // For now, let's try "script" as it's a global script.
      sourceType: "script", // Changed from "module"
      globals: {
        ...globals.browser, // Defines browser global variables like 'document', 'Audio', etc.
        // Add any other custom globals if needed
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off"
    }
  }
];
