$ErrorActionPreference = "Stop"

Write-Host "Updating documentation..."

# Update 03_ARCHITECTURE.md
$archFile = "03_ARCHITECTURE.md"
if (Test-Path $archFile) {
    $archContent = Get-Content $archFile -Raw
    $archContent = $archContent -replace "- разрешения;", "- разрешения (проверка прав при создании remote session, изменении permissions и выдаче подписанного слепка разрешений);"
    $archContent += "`n## Проверка прав`n`nКаждая отдельная OBS-команда не проходит через backend. Окончательную проверку каждой команды выполняет desktop-приложение стримера на основе выданных разрешений."
    Set-Content -Path $archFile -Value $archContent
}

# Update 07_OBS_AND_P2P.md
$p2pFile = "07_OBS_AND_P2P.md"
if (Test-Path $p2pFile) {
    $p2pContent = Get-Content $p2pFile -Raw
    $p2pContent = $p2pContent -replace "- TURN fallback.", "- TURN fallback (см. ограничения TURN)."
    $turnRestrictions = @"

## Ограничения TURN (Relay)

TURN не считается основным способом передачи данных, а используется только как fallback.
- команды и события могут работать через TURN;
- preview через TURN должен иметь лимит качества, FPS и трафика;
- file transfer через TURN должен иметь ограничения размера;
- приложение должно показывать, используется Direct P2P или Relay;
- возможность preview через TURN должна управляться entitlement и настройками тарифа.
"@
    $p2pContent += $turnRestrictions
    Set-Content -Path $p2pFile -Value $p2pContent
}

Write-Host "Setting up Monorepo foundation..."

# pnpm-workspace.yaml
Set-Content "pnpm-workspace.yaml" -Value "packages:`n  - 'apps/*'`n  - 'packages/*'"

# Root package.json
$rootPackageJson = @"
{
  "name": "obs-remote-control",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "turbo run build",
    "lint": "eslint .",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "turbo": "^2.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "vitest": "^2.0.0"
  }
}
"@
Set-Content "package.json" -Value $rootPackageJson

# turbo.json
$turboJson = @"
{
  "`$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "lint": {},
    "typecheck": {},
    "test": {}
  }
}
"@
Set-Content "turbo.json" -Value $turboJson

# tsconfig.base.json
$tsconfigBase = @"
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true
  }
}
"@
Set-Content "tsconfig.base.json" -Value $tsconfigBase

# eslint.config.js
$eslintConfig = @"
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    ignores: ["**/dist/**", "**/.next/**"]
  },
  {
    rules: {
      "no-unused-vars": "off"
    }
  }
];
"@
Set-Content "eslint.config.js" -Value $eslintConfig

# .prettierrc
Set-Content ".prettierrc" -Value "{ `"semi`": true, `"singleQuote`": true }"

Write-Host "Creating directories..."

$apps = @("desktop", "website", "backend")
$packages = @("api-client", "database", "env", "logger", "obs-adapter", "obs-contracts", "p2p-protocol", "permissions", "shared-types", "ui", "validation")

New-Item -ItemType Directory -Force -Path "apps" | Out-Null
New-Item -ItemType Directory -Force -Path "packages" | Out-Null
New-Item -ItemType Directory -Force -Path "infrastructure/docker" | Out-Null
New-Item -ItemType Directory -Force -Path ".github/workflows" | Out-Null

# docker-compose.yml
$dockerCompose = @"
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: obs_remote
    ports:
      - "5432:5432"
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  coturn:
    image: coturn/coturn:latest
    ports:
      - "3478:3478"
      - "3478:3478/udp"
"@
Set-Content "infrastructure/docker/docker-compose.yml" -Value $dockerCompose

# CI workflow
$ciYml = @"
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm run lint
      - run: pnpm run typecheck
      - run: pnpm run test
      - run: pnpm run build
"@
Set-Content ".github/workflows/ci.yml" -Value $ciYml

Write-Host "Scaffolding Apps..."

foreach ($app in $apps) {
  New-Item -ItemType Directory -Force -Path "apps/$app/src" | Out-Null
  $appPkg = @"
{
  "name": "@obs-remote/$app",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "echo 'build $app'",
    "typecheck": "tsc --noEmit",
    "test": "echo 'test $app'"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
"@
  Set-Content "apps/$app/package.json" -Value $appPkg
  $appTsConfig = @"
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
"@
  Set-Content "apps/$app/tsconfig.json" -Value $appTsConfig
  Set-Content "apps/$app/src/index.ts" -Value "export const init = () => console.log('$app initialized');"
  Set-Content "apps/$app/README.md" -Value "# @obs-remote/$app`n`nApp description."
}

Write-Host "Scaffolding Packages..."

foreach ($pkg in $packages) {
  New-Item -ItemType Directory -Force -Path "packages/$pkg/src" | Out-Null
  
  $extraDeps = ""
  if ($pkg -eq "logger") {
      $extraDeps = "`n  `"dependencies`": {`n    `"pino`": `"^9.0.0`"`n  },"
  } elseif ($pkg -eq "env" -or $pkg -eq "validation") {
      $extraDeps = "`n  `"dependencies`": {`n    `"zod`": `"^3.0.0`"`n  },"
  }

  $pkgJson = @"
{
  "name": "@obs-remote/$pkg",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
  },${extraDeps}
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
"@
  Set-Content "packages/$pkg/package.json" -Value $pkgJson
  $pkgTsConfig = @"
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
"@
  Set-Content "packages/$pkg/tsconfig.json" -Value $pkgTsConfig
  Set-Content "packages/$pkg/src/index.ts" -Value "export const testFn = () => '$pkg';"
  Set-Content "packages/$pkg/src/index.test.ts" -Value "import { test, expect } from 'vitest';`nimport { testFn } from './index';`n`ntest('basic', () => { expect(testFn()).toBe('$pkg'); });"
  Set-Content "packages/$pkg/README.md" -Value "# @obs-remote/$pkg`n`nPackage description."
}

Write-Host "Foundation scaffolding completed."
