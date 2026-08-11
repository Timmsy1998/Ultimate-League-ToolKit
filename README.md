# ULTK — Ultimate League ToolKit

A desktop companion app for League of Legends, built on the local client
(LCU) API. ULTK stays on the outside of the game: no memory access, no
injection, no interaction with Vanguard, and no automation of gameplay. Just
client-side tools — stats, notifications, and quality-of-life utilities —
wrapped in an app that's fast, light on resources, and pleasant to use.

This project is in early development. The current focus is the application
shell and UI; LCU integration comes next.

## Status

- [x] UI shell — navigation, pages, theming
- [x] LCU client connection
- [x] First tools (match history, rune pages, session overview)
- [x] Auto-update pipeline
- [ ] Packaged installer

## Getting started

Requires [Node.js](https://nodejs.org/) 20 or newer.

```sh
npm install
npm run dev
```

This starts the app in development mode with hot reload.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Run the app in development mode |
| `npm run build` | Type-check and build for production |
| `npm run typecheck` | Type-check without emitting output |
| `npm run icons` | Regenerate app icons from `build/icon.svg` |
| `npm run dist:win` | Build and package a Windows installer locally |
| `npm run release:win` | Build and publish a Windows installer to GitHub Releases (CI only) |

## Releases & updates

Releases are fully automated — nobody hand-bumps a version number or
uploads an installer by hand.

- Commit messages on the version-integration branch (e.g. `v1.0.0`) follow
  [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`,
  `fix:`, `feat!:` for breaking changes, etc.).
- When that branch is merged into `master`, a GitHub Actions workflow
  (`.github/workflows/release.yml`) runs
  [semantic-release](https://semantic-release.gitbook.io/), which reads
  those commit messages to decide the next version, generates release
  notes, and publishes a GitHub Release with the matching git tag.
- The same workflow then builds the Windows installer and attaches it to
  that release.
- `package.json`'s `version` field intentionally stays at
  `0.0.0-development` in source control — the real version only ever lives
  in git tags and GitHub Releases, computed by CI. This keeps `master`
  free of any bot-authored commits, which its branch protection wouldn't
  allow anyway.

The installed app checks GitHub Releases for a newer version shortly after
launch and every few hours after that, downloads any update in the
background, and shows a small banner (and a control in Settings → About)
once it's ready to install on restart — no manual download or re-run of the
installer required.

Installer builds are not currently code-signed (no signing certificate
yet). Update integrity is still verified — electron-updater checks the
downloaded installer's hash against the one published alongside it — but
this is a known gap for a future pass once a certificate is available.

## Compliance

ULTK is built to stay clearly on the right side of Riot's rules for
third-party tools:

- Uses only the local LCU API and public Riot Developer APIs.
- No reading or writing of client or game process memory.
- No code injection into any Riot process.
- No interaction with Vanguard.
- No automation of in-game actions.

If a feature idea would cross any of those lines, it's out of scope for this
project, full stop.

## Contributing

Contributions are welcome. `master` only ever receives a merge from the
current version branch (e.g. `v1.0.0`) once that version is ready to ship —
it doesn't take feature work directly. Branch from the current version
branch, and open your pull request back into it. Open an issue first for
anything non-trivial so we can talk through the approach before you put
time into it.

## License

[MIT](LICENSE)
