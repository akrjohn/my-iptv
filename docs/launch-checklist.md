# Launch Checklist

Status as of now:

## Completed

- [x] M3U/M3U8 playlist URL ingest and sync
- [x] Parse channels, logos, groups, `tvg-id`, `tvg-name`, and stream URLs
- [x] Normalize the channel catalog
- [x] Browse groups and channels
- [x] Search channels
- [x] Play live channels
- [x] HLS-first playback path in the browser/web shell
- [x] Favorites and recents persistence
- [x] Source setup, test connection, resync, delete source, and clear local data
- [x] Basic Source Doctor summary and typed sync errors
- [x] Remote-first navigation and visible focus states
- [x] Browser-runnable keyboard navigation for TV-style testing
- [x] Basic XMLTV current/next program support
- [x] WebOS app metadata and icon assets
- [x] Local-first storage for catalog data
- [x] No credential or playlist URL logging in status messages

## Still Pending Before A Real TV Launch

- [ ] Verify install and launch on an LG TV or webOS simulator
- [ ] Confirm real-device playback behavior on the target TV model
- [ ] Validate browser CORS/network behavior against your real playlist URLs

## Nice To Have After Launch

- [ ] Xtream Codes support
- [ ] Advanced Source Doctor cleanup workflows
- [ ] Mobile companion app

## Notes

- If you want a strict launch gate, the main remaining blocker is device verification.
- If you are shipping a browser-only preview, the app is already very close to launch-ready.
