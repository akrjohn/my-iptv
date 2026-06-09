# LG webOS Deployment

This repo is a Vite web app, so there are two practical ways to get it onto an LG TV:

## 1. Fastest path: open the dev server from the TV browser

1. Run `pnpm install` if needed.
2. Start the app with `pnpm dev:webos`.
3. Find your computer's LAN IP address.
4. Open `http://<your-ip>:5173` in the LG TV browser.

Use this for quick UI checks and remote testing.

## 2. Sideload as a webOS app with CLI

### Install the webOS CLI

```sh
npm install -g @webos-tools/cli
ares -V
```

### Add your TV as a device

Enable Developer Mode on the TV, then add the device with the TV IP, port, and `prisoner` user.

```sh
ares-setup-device --add myTV -i "host=<tv-ip>" -i "port=9922" -i "username=prisoner"
```

If prompted, enter the passphrase shown by the Developer Mode app.

Verify the device:

```sh
ares-setup-device --list
```

### Build the app

```sh
pnpm build
```

### Add webOS app metadata

The build output needs a webOS `appinfo.json` plus icons before packaging.
Keep those files in `apps/webos-tv/public/` so Vite copies them into `dist/`.

Recommended values:

```json
{
  "id": "com.myiptv.webos",
  "version": "0.1.0",
  "vendor": "MY IPTV",
  "type": "web",
  "main": "index.html",
  "title": "MY IPTV",
  "icon": "icon.png",
  "largeIcon": "largeIcon.png"
}
```

### Package and install

Package the built app directory, then install the generated `.ipk`.

If you keep the manifest in `public/`, package the built `dist/` directory after the build copies it over.

```sh
ares-package ./apps/webos-tv/dist
ares-install --device myTV ./com.myiptv.webos_0.1.0_all.ipk
```

### Launch on the TV

```sh
ares-launch --device myTV com.myiptv.webos
```

### Debugging

For a debug build, package without minifying:

```sh
ares-package --no-minify ./apps/webos-tv/dist
```

Then open Web Inspector while the app is running:

```sh
ares-inspect --device myTV --app com.myiptv.webos --open
```

## Notes

- Do not log playlist URLs or credentials while testing.
- Keep `appinfo.json`, icons, and the built `dist` directory together when packaging.
- Replace the example app ID with your own if you already use that namespace.
