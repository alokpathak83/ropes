# Contentstack Kickstart – Next.js SSR (kickstart-next-ssr) – Agent guide

**Universal entry point** for contributors and AI agents. Detailed conventions live in **`skills/*/SKILL.md`**.

## What this repo is

| Field | Detail |
| --- | --- |
| **Name:** | [https://github.com/contentstack/kickstart-next-ssr](https://github.com/contentstack/kickstart-next-ssr) |
| **Purpose:** | Minimal Next.js SSR sample that connects to Contentstack: SDK initialization, content delivery, and Live Preview in SSR mode. Product onboarding and stack seeding are documented in [README.md](README.md). |
| **Out of scope (if any):** | Not a general-purpose SDK; it demonstrates one kickstart path. Does not ship automated tests or an application CI build today. |

## Tech stack (at a glance)

| Area | Details |
| --- | --- |
| **Language** | TypeScript 5 (`strict` in [tsconfig.json](tsconfig.json)); React 19 |
| **Build** | npm; Next.js 16 ([package.json](package.json)); [next.config.mjs](next.config.mjs) |
| **Tests** | No test script or runner in this repo; see [skills/testing/SKILL.md](skills/testing/SKILL.md) |
| **Lint / coverage** | ESLint via `next lint` ([.eslintrc.json](.eslintrc.json)); no coverage config |
| **Other** | Tailwind CSS v4 ([postcss.config.mjs](postcss.config.mjs), [app/globals.css](app/globals.css)); Contentstack Delivery SDK + Live Preview utilities |

## Commands (quick reference)

| Command type | Command |
| --- | --- |
| **Build** | `npm run build` |
| **Dev** | `npm run dev` |
| **Start (after build)** | `npm start` |
| **Lint** | `npm run lint` |

**CI:** This repository runs policy and supply-chain workflows on GitHub, not `npm` build/test. See [.github/workflows/policy-scan.yml](.github/workflows/policy-scan.yml), [.github/workflows/sca-scan.yml](.github/workflows/sca-scan.yml), and [.github/workflows/issues-jira.yml](.github/workflows/issues-jira.yml).

## Where the documentation lives: skills

| Skill | Path | What it covers |
| --- | --- | --- |
| **Dev workflow** | [`skills/dev-workflow/SKILL.md`](skills/dev-workflow/SKILL.md) | Setup, common commands, repo expectations |
| **Contentstack kickstart** | [`skills/contentstack-kickstart/SKILL.md`](skills/contentstack-kickstart/SKILL.md) | SDK, Live Preview, env vars, data-fetch patterns |
| **TypeScript style** | [`skills/typescript-style/SKILL.md`](skills/typescript-style/SKILL.md) | TS/React conventions used here |
| **Testing** | [`skills/testing/SKILL.md`](skills/testing/SKILL.md) | Current test posture; manual checks |
| **Code review** | [`skills/code-review/SKILL.md`](skills/code-review/SKILL.md) | PR checklist for this codebase |
| **Framework (Next.js)** | [`skills/framework/SKILL.md`](skills/framework/SKILL.md) | App Router, Next config, Tailwind/PostCSS |

Plain links to each `SKILL.md` are in [`skills/README.md`](skills/README.md) (summaries stay in the table above).

## Using Cursor (optional)

If you use **Cursor**, [`.cursor/rules/README.md`](.cursor/rules/README.md) only points to **`AGENTS.md`**—the same docs as everyone else.
