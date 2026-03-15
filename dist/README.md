# Calendar Deadlines

Kanban-style deadline tracker plugin for SiYuan.

This repository is English-only.

## Current status

Initial scaffold and core implementation are in progress.

## Development

1. Install dependencies
   - npm install
2. Build in watch mode
   - npm run dev
3. Build release zip
   - npm run build
4. Typecheck
   - npm run check

## UI Preview (Without SiYuan)

You can preview and iterate the Kanban interface in a browser before loading the plugin in SiYuan.

1. Start preview server
   - npm run preview-ui
2. Open
   - http://127.0.0.1:4173/ui-preview/

Notes:
- This mode validates UI behavior (layout, drag/drop, task actions).
- It does not validate SiYuan APIs (tab opening, dock lifecycle, plugin event bus).

## Integration Test (Inside SiYuan)

For real plugin integration, you must run inside SiYuan.

1. Build plugin output
   - npm run build
2. Copy or symlink dist contents to your SiYuan plugin folder named calendar-deadlines
3. Enable Calendar Deadlines in SiYuan plugin management
4. Open top bar action and launch Deadline Board tab

The build output is generated into `dev/` for development and `dist/` for release.
