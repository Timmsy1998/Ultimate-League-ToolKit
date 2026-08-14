# ULTK (Ultimate League ToolKit)

A desktop companion app for League of Legends, built on the local client
(LCU) API. ULTK stays on the outside of the game: no game or client process
memory access, no interaction with Vanguard, and no automation of gameplay
or input. The one narrow, opt-in exception is purely cosmetic reskinning of
the League Client's own UI, described below.

## Features

- LCU connection with live status, summoner info, and gameflow phase
  tracking
- Dashboard with rank tracking, activity feed, and session overview
- Rune page builder: build pages per champion and import them straight into
  the client
- Match history
- Desktop notifications, with optional auto-accept for ready checks
- Tools: leave lobby (dodge), loot disenchant helper, invite all friends
- Client Theme: cosmetic reskin of the League Client itself (background
  image, GIF, or muted video; accent color; font, including custom font
  uploads; profile banner and icon)
- Auto-update pipeline with code-signed installers

## Client theming

ULTK can optionally reskin the League Client's own UI. This is opt-in, off
by default, and reversible with one click.

It works by pointing the League Client's launch at a small vendored core
(from [PenguLoader](https://github.com/PenguLoader/PenguLoader), MIT
licensed, see `THIRD_PARTY_NOTICES.md`) via a Windows registry change
(Image File Execution Options), which loads a plugin folder ULTK writes.
That plugin only ever changes appearance: background, accent color, font,
banner, and icon. It does not touch game logic, matchmaking, or what the
client sends or receives, and it never reads or writes League Client or
game process memory. Enabling it asks for admin permission once, for that
one registry change. Nothing else in ULTK runs elevated.

## Status

- [x] UI shell, navigation, theming
- [x] LCU client connection
- [x] Tools: dodge, loot helper, invite friends, auto-accept
- [x] Rune page builder
- [x] Client Theme (background image/GIF/video, accent color, fonts,
      banner, icon)
- [x] Auto-update pipeline with signed installers
- [ ] Embedding tools directly into the client's own UI

## Getting started

Requires [Node.js](https://nodejs.org/) 20 or newer.

```sh
npm install
npm run dev
```

This starts the app in development mode with hot reload.

The client-theme feature also needs a native `core.dll` built once locally
(pnpm and MSBuild required): `npm run build:pengu-core`. Without it,
client theming is simply unavailable in dev; everything else works fine.

## Scripts

| Command                    | What it does                                            |
| --------------------------- | -------------------------------------------------------- |
| `npm run dev`               | Run the app in development mode                          |
| `npm run build`             | Type-check and build for production                      |
| `npm run typecheck`         | Type-check without emitting output                       |
| `npm run icons`             | Regenerate app icons from `build/icon.svg`                |
| `npm run build:pengu-core`  | Build the native client-theme core (needs pnpm + MSBuild) |
| `npm run dist:win`          | Build and package a Windows installer locally             |
| `npm run build:win`         | Build a Windows installer without publishing (used by CI) |

## Releases and updates

Releases are fully automated. Nobody hand-bumps a version number or
uploads an installer by hand.

- Commit messages on the version-integration branch (e.g. `v1.3.0`) follow
  [Conventional Commits](https://www.conventionalcommits.org/): `feat:`,
  `fix:`, `feat!:` for breaking changes, and so on.
- When that branch is merged into `master`, a GitHub Actions workflow
  (`.github/workflows/release.yml`) runs
  [semantic-release](https://semantic-release.gitbook.io/), which reads
  those commit messages to decide the next version, generates release
  notes, and publishes a GitHub Release with the matching git tag.
- The same workflow then builds the Windows installer, signs it, and
  attaches it to that release.
- `package.json`'s `version` field intentionally stays at
  `0.0.0-development` in source control. The real version only ever lives
  in git tags and GitHub Releases, computed by CI. This keeps `master`
  free of any bot-authored commits, which its branch protection wouldn't
  allow anyway.

The installed app checks GitHub Releases for a newer version shortly after
launch and every few hours after that, downloads any update in the
background, and shows a small banner (and a control in Settings -> About)
once it's ready to install on restart. No manual download or re-run of the
installer required.

Installer builds are code-signed via [SignPath](https://signpath.io/),
who provide free code signing for open source projects. Update integrity
is also checked independently: electron-updater verifies the downloaded
installer's hash against the one published alongside it.

## Compliance

ULTK is built to stay clearly on the right side of Riot's rules for
third-party tools:

- Uses only the local LCU API and public Riot Developer APIs.
- No reading or writing of League Client or game process memory.
- No interaction with Vanguard, under any circumstance.
- No automation of in-game actions or input scripting.
- No modification of game or client files on disk, with one narrow
  exception: the client theming feature above, which only ever changes
  cosmetic appearance via CSS/asset injection, is opt-in, and is fully
  reversible.

If a feature idea would cross any of those lines, it's out of scope for
this project, full stop.

## Contributing

Contributions are welcome. `master` only ever receives a merge from the
current version branch (e.g. `v1.3.0`) once that version is ready to
ship. It doesn't take feature work directly. Branch from the current
version branch, and open your pull request back into it. Open an issue
first for anything non-trivial so we can talk through the approach before
you put time into it.

## License

[MIT](LICENSE)
