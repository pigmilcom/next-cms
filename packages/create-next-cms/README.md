# @pigmilcom/create-next-cms

Scaffold a new **NextCMS** project with a single command.

## Usage

```bash
# npm
npm create @pigmilcom/next-cms

# yarn
yarn create @pigmilcom/next-cms

# pnpm
pnpm create @pigmilcom/next-cms

# bun
bun create @pigmilcom/next-cms
```

You can also pass the project name directly:

```bash
npm create @pigmilcom/next-cms my-shop
```

## What it does

1. Clones the [NextCMS](https://github.com/pigmilcom/next-cms) template
2. Removes git history so you start fresh
3. Creates a `.env` file from the sample
4. Updates `package.json` with your project name
5. Optionally installs dependencies

## After scaffolding

```bash
cd my-shop
# Edit .env with your database URL and secrets
npm run dev
```

## Requirements

- **Node.js** ≥ 18
- **git** (recommended) or `tar` for fallback download

## Links

- [NextCMS repository](https://github.com/pigmilcom/next-cms)
- [Documentation](https://github.com/pigmilcom/next-cms/tree/main/docs)
- [License](https://github.com/pigmilcom/next-cms/blob/main/LICENSE.md)
