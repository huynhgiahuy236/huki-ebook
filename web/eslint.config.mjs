import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const reactCompilerRules = [
  'hooks',
  'capitalized-calls',
  'static-components',
  'use-memo',
  'void-use-memo',
  'preserve-manual-memoization',
  'memo-dependencies',
  'incompatible-library',
  'immutability',
  'globals',
  'refs',
  'memoized-effect-dependencies',
  'exhaustive-effect-dependencies',
  'set-state-in-effect',
  'no-deriving-state-in-effects',
  'error-boundaries',
  'purity',
  'set-state-in-render',
  'invariant',
  'todo',
  'syntax',
  'unsupported-syntax',
  'config',
  'gating',
  'rule-suppression',
  'fbt',
  'component-hook-factories'
].reduce((acc, rule) => {
  acc[`react-hooks/${rule}`] = 'off';
  return acc;
}, {});

const eslintConfig = defineConfig([
  {
    // Global ignores must be the first entry in flat config
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/dist/**",
      "**/next-env.d.ts",
      "**/scripts/**",
      "**/public/**",
      "**/.eslintcache",
      "**/coverage/**",
    ],
  },
  ...nextVitals,
  ...nextTs,
  {
    // The migrated React 18 UI intentionally preserves inline editorial copy
    // and state-driven effects while it runs inside a client-only boundary.
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "error",
      ...reactCompilerRules,
      "@typescript-eslint/ban-ts-comment": "off",
      "prefer-const": "warn",
    },
  },
  {
    // The original UI depends on runtime Google Font links; using next/font
    // would require a network download during every production build.
    files: ["src/app/layout.tsx"],
    rules: {
      "@next/next/no-page-custom-font": "off",
    },
  },
]);

export default eslintConfig;
