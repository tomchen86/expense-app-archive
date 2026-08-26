// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  // Ignore patterns (replaces .eslintignore)
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/.expo/**',
      '**/metro-cache/**',
      '**/android/**',
      '**/ios/**',
      '**/*.generated.*',
      '**/migrations/**',
      '**/.git/**',
      '**/webpack.config.js',
    ],
  },

  // Base JavaScript configuration
  js.configs.recommended,

  // TypeScript configuration
  ...tseslint.configs.recommended,

  // Global rules for all files
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      // Allow console.log in development
      'no-console': 'off',
      // TypeScript-specific adjustments
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // React configuration for JSX/TSX files
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // JSX quotes - prefer double quotes
      'jsx-quotes': ['error', 'prefer-double'],
    },
  },

  // Mobile app specific overrides
  {
    files: ['apps/mobile/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        // React Native globals
        __DEV__: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // Platform APIs and native material packages stay behind mobile adapters.
  {
    files: ['apps/mobile/{app,src}/**/*.{js,jsx,ts,tsx}'],
    ignores: [
      'apps/mobile/src/**/__tests__/**',
      'apps/mobile/src/**/*.test.{js,jsx,ts,tsx}',
      'apps/mobile/src/components/ui/*.ios.{js,jsx,ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'expo-blur',
              message: 'Import Expo Blur only from an iOS semantic UI adapter.',
            },
            {
              name: 'expo-glass-effect',
              message:
                'Import Liquid Glass only from an iOS semantic UI adapter.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.name='Platform'][property.name='OS']",
          message:
            'Use platform-specific files or a semantic adapter instead of Platform.OS.',
        },
      ],
    },
  },

  // Screens, components, and hooks consume the application facade, not slices.
  {
    files: [
      'apps/mobile/app/**/*.{js,jsx,ts,tsx}',
      'apps/mobile/src/components/**/*.{js,jsx,ts,tsx}',
      'apps/mobile/src/hooks/**/*.{js,jsx,ts,tsx}',
      'apps/mobile/src/screens/**/*.{js,jsx,ts,tsx}',
    ],
    ignores: [
      'apps/mobile/src/**/__tests__/**',
      'apps/mobile/src/**/*.test.{js,jsx,ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/store/features/*'],
              message:
                'Use the mobile application store facade or a feature query/command.',
            },
          ],
        },
      ],
    },
  },

  // Web app specific overrides
  {
    files: ['apps/web/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
  },

  // API specific overrides
  {
    files: ['apps/api/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
  },

  // E2E test files (Detox)
  {
    files: ['**/e2e/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
        // Detox globals
        device: 'readonly',
        element: 'readonly',
        by: 'readonly',
        waitFor: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        testHelpers: 'readonly',
      },
    },
    rules: {
      // Relax rules for e2e tests but enforce ES modules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off',
    },
  },

  // Test setup files (allow CommonJS for Jest mocks)
  {
    files: ['**/__tests__/setup*.{js,ts}', '**/jest.setup*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {
      // Allow CommonJS for Jest setup files
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off',
    },
  },

  // Test files configuration
  {
    files: [
      '**/*.{test,spec}.{js,jsx,ts,tsx}',
      '**/__tests__/**/*.{js,jsx,ts,tsx}',
    ],
    ignores: ['**/__tests__/setup*.{js,ts}', '**/jest.setup*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {
      // Relax rules for test files but enforce ES modules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off',
    },
  },

  // Configuration files (webpack, etc.)
  {
    files: ['**/*.config.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Prettier must come last to override conflicting rules
  prettier,
];
