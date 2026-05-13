import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Bloco E — Lint hardening
      // Promove exhaustive-deps de warn → error para evitar bugs de stale closure.
      "react-hooks/exhaustive-deps": "error",
      // Força o uso do logger condicional (src/lib/logger.ts) em vez de console.log/warn,
      // que aparece em produção. console.error continua permitido (sempre passa).
      "no-restricted-syntax": [
        "warn",
        {
          selector: "CallExpression[callee.object.name='console'][callee.property.name=/^(log|warn|debug|info)$/]",
          message: "Use logger.* de '@/lib/logger' em vez de console.* (são silenciados em produção).",
        },
      ],
    },
  },
);
