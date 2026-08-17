# 💻 IDE Setup

Hướng dẫn cấu hình VS Code cho dự án.

## 📦 Recommended Extensions

### Must Have

| Extension | Purpose |
|-----------|---------|
| ESLint | JavaScript/TypeScript linting |
| Prettier | Code formatting |
| TypeScript Vue Plugin (Volar) | TypeScript support |
| PostgreSQL | Database client |
| MongoDB for VS Code | MongoDB client |
| REST Client | API testing trong VS Code |
| GitLens | Git integration |
| Error Lens | Inline error display |

### Optional

| Extension | Purpose |
|-----------|---------|
| Thunder Client | API client (thay thế Postman) |
| Docker | Docker management |
| Remote - Containers | Development trong container |
| YAML | YAML editing |
| Markdown All in One | Markdown support |

## ⚙️ VS Code Settings

Tạo file `.vscode/settings.json` ở root:

```json
{
  // ============================================
  // Workspace Settings
  // ============================================
  "workspace.edit.insertSpaces": true,
  "workspace.edit.tabSize": 2,

  // ============================================
  // TypeScript
  // ============================================
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "typescript.inlayHints.functionLikeReturnTypes.enabled": true,
  "typescript.inlayHints.parameterTypes.enabled": true,

  // ============================================
  // Format
  // ============================================
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },

  // ============================================
  // Linting
  // ============================================
  "eslint.validate": [
    "javascript",
    "typescript",
    "javascriptreact",
    "typescriptreact"
  ],
  "eslint.workingDirectories": [
    {"mode": "auto"}
  ],

  // ============================================
  // Files
  // ============================================
  "files.exclude": {
    "**/node_modules": true,
    "**/.git": true,
    "**/dist": true,
    "**/build": true,
    "**/.next": true
  },
  "files.associations": {
    "*.module.css": "css",
    "*.dto.ts": "typescript"
  },

  // ============================================
  // Search
  // ============================================
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/build": true,
    "**/.next": true,
    "**/*.log": true
  },

  // ============================================
  // Database
  // ============================================
  "postgres.showDatabases": true,
  "postgres.connectionTimeout": 10,

  // ============================================
  // Terminal
  // ============================================
  "terminal.integrated.fontSize": 13,
  "terminal.integrated.cursorStyle": "line",
  "terminal.integrated.defaultProfile.osx": "zsh",

  // ============================================
  // Performance
  // ============================================
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": true,
  "typescript.preferences.includePackageJsonAutoImports": "on",

  // ============================================
  // Remote Development
  // ============================================
  "remote.SSH.showLoginTerminal": true,

  // ============================================
  // Live Share (Optional)
  // ============================================
  "liveshare.allowGuestTaskControl": true
}
```

## 🔧 Recommended Snippets

Tạo file `.vscode/snippets/typescript.json`:

```json
{
  "NestJS Controller": {
    "prefix": "nestController",
    "body": [
      "import { Controller, Get, Post, Body, Param } from '@nestjs/common';",
      "import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';",
      "",
      "@ApiTags('${1:resource}')",
      "@Controller('${2:resources}')",
      "export class ${3:Resource}Controller {",
      "  constructor(private readonly ${4:resource}Service: ${3:Resource}Service) {}",
      "",
      "  @Post()",
      "  @ApiOperation({ summary: '${5:Create new}' })",
      "  @ApiResponse({ status: 201, description: 'Created successfully' })",
      "  create(@Body() create${3:Resource}Dto: Create${3:Resource}Dto) {",
      "    return this.${4:resource}Service.create(create${3:Resource}Dto);",
      "  }",
      "",
      "  @Get()",
      "  @ApiOperation({ summary: 'Get all' })",
      "  findAll() {",
      "    return this.${4:resource}Service.findAll();",
      "  }",
      "",
      "  @Get(':id')",
      "  @ApiOperation({ summary: 'Get one by ID' })",
      "  findOne(@Param('id') id: string) {",
      "    return this.${4:resource}Service.findOne(id);",
      "  }",
      "}"
    ],
    "description": "NestJS Controller template"
  },
  "NestJS Service": {
    "prefix": "nestService",
    "body": [
      "import { Injectable, NotFoundException } from '@nestjs/common';",
      "",
      "@Injectable()",
      "export class ${1:Resource}Service {",
      "  async create(create${1:Resource}Dto: any) {",
      "    // TODO: implement",
      "    return {};",
      "  }",
      "",
      "  async findAll() {",
      "    return [];",
      "  }",
      "",
      "  async findOne(id: string) {",
      "    // TODO: implement",
      "    return {};",
      "  }",
      "}"
    ],
    "description": "NestJS Service template"
  },
  "NestJS Module": {
    "prefix": "nestModule",
    "body": [
      "import { Module } from '@nestjs/common';",
      "import { ${1:Resource}Service } from './${2:resource}.service';",
      "import { ${1:Resource}Controller } from './${2:resource}.controller';",
      "",
      "@Module({",
      "  controllers: [${1:Resource}Controller],",
      "  providers: [${1:Resource}Service],",
      "  exports: [${1:Resource}Service],",
      "})",
      "export class ${1:Resource}Module {}"
    ],
    "description": "NestJS Module template"
  }
}
```

## 📁 Multi-Root Workspace

Tạo file `.code-workspace`:

```json
{
  "folders": [
    { "path": ".", "name": "huki-ebook" },
    { "path": "services/identity-service", "name": "identity-service" },
    { "path": "services/business-service", "name": "business-service" },
    { "path": "services/commerce-service", "name": "commerce-service" },
    { "path": "services/shipping-service", "name": "shipping-service" },
    { "path": "services/community-service", "name": "community-service" },
    { "path": "services/promotion-service", "name": "promotion-service" },
    { "path": "services/api-gateway", "name": "api-gateway" },
    { "path": "apps/web", "name": "web" },
    { "path": "apps/mobile", "name": "mobile" }
  ],
  "settings": {
    "editor.formatOnSave": true
  }
}
```

## 🔌 Task Configurations

Tạo file `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "docker:up",
      "type": "shell",
      "command": "docker-compose up -d",
      "problemMatcher": []
    },
    {
      "label": "docker:down",
      "type": "shell",
      "command": "docker-compose down",
      "problemMatcher": []
    },
    {
      "label": "docker:logs",
      "type": "shell",
      "command": "docker-compose logs -f",
      "problemMatcher": []
    },
    {
      "label": "install:all",
      "type": "shell",
      "command": "npm run install:all",
      "problemMatcher": []
    },
    {
      "label": "migrate:dev",
      "type": "shell",
      "command": "npm run migrate:dev",
      "problemMatcher": []
    }
  ]
}
```

## 🎨 Theme Recommendations

| Theme | Purpose |
|-------|---------|
| One Dark Pro | Dark theme (recommended) |
| GitHub Theme | Light theme |
| Material Theme | Material Design colors |
