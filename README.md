# Web Apps Next

Let apps escape your tabs for a better user experience.

## Develop

### Dependencies

`npm` & `jpm`. Install [Extension Auto-Installer](https://addons.mozilla.org/en-US/firefox/addon/autoinstaller/) for local continues development (uses `jpm post`).

### Folders

* `src` contains shared files that are copied into the addons `/data` folder.
* `firefox` contains Firefox specific files like `index.js`, `package.json` and `test`.

### Flow

Start to watch files, build add-on and jpm-post the XPI:

```
> npm start
```

* `gulp` runs transforms and copies the files into `dist`
* `jpm post` side-loads the XPI into the running Firefox instances
