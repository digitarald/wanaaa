import {data} from "sdk/self";
import tabs from "sdk/tabs";
import {PageMod} from "sdk/page-mod";
import {Panel} from "sdk/panel";
import {ToggleButton} from "sdk/ui/button/toggle";
import {storage} from "sdk/simple-storage";

function log() {
  console.log.apply(console, ["[index.js]"].concat(Array.from(arguments)));
}

class Db {
  constructor() {
    if (!storage.apps) {
      storage.apps = {};
    }
    if (!storage.appHistory) {
      storage.appHistory = {};
    }
  }

  writeHistory(app) {
    let entry = storage.appHistory[app.scope];
    if (!entry) {
      entry = {
        app: app,
        visits: []
      };
      storage.appHistory[app.scope] = entry;
    } else {
      entry.app = app;
    }
    entry.visits.push(Date.now());
  }

  findRecentHistory(cutDays = 14) {
    const results = [];
    const cutPast = Date.now() - cutDays * 24 * 60 * 60 * 1000;
    for (let scope in storage.appHistory) {
      const {visits, app} = storage.appHistory[scope];
      const last = visits[visits.length - 1];
      if (last > cutPast) {
        results.push({last, app});
      }
    }
    results.sort((a, b) => a.last < b.last);

    return results
      .map((result) => result.app)
      .filter((app) => !this.findAppByScope(app.scope));
  }

  insertApp(app) {
    storage.apps[app.scope] = app;
  }

  deleteApp(app) {
    console.log("deleteApp", app.scope);
    delete storage.apps[app.scope];
  }

  findHistoryByScope(scope) {
    return storage.appHistory[scope] || null;
  }

  findAppByScope(scope) {
    return storage.apps[scope] || null;
  }

  findAppByUrl(scope) {
    for (let key in storage.apps) {
      if (!key.startsWith(scope)) {
        continue;
      }
      return storage.apps[key];
    }
    return null;
  }

  findAllApps() {
    return Object.keys(storage.apps).map((scope) => storage.apps[scope]);
  }
}

let db = new Db();
let appTabs = new WeakMap();

class App {
  constructor(meta) {
    this.meta = meta;
  }

  serialize() {
    return this.meta;
  }

  pin() {
    db.insertApp(this.serialize());
  }

  unpin() {
    db.deleteApp(this.serialize());
  }

  launch() {
    tabs.open({
      url: this.meta.scope,
      isPinned: true
    });
  }

  get tab() {
    return appTabs.get(this);
  }

  static fromScrape(scraped) {
    const meta = this.processApp(scraped);
    if (!meta) {
      return null;
    }
    return new App(meta);
  }

  static fromTab(tab) {
    return appTabs.get(tab);
  }

  static fromHistory(scope) {
    const found = db.findHistoryByScope(scope);
    if (!found) {
      return null;
    }
    return new App(found.app);
  }

  static fromInstalled(scope) {
    const found = db.findAppByScope(scope);
    if (!found) {
      return null;
    }
    return new App(found);
  }

  static processApp(scraped) {
    const {manifest, og, apple, origin, title} = scraped;
    if (manifest) {
      const {response, responseUrl} = manifest;
      return {
        name: response.name,
        startUrl: this.normalizeUrl(manifest.start_url || "/", origin),
        scope: origin + (response.scope || "/"),
        icon: this.findBestIcon(response.icons, origin),
        manifest: response,
        manifestUrl: responseUrl
      };
    }
    if (apple || og) {
      return {
        name: (apple && apple.title) || (og && og.site_name) || title,
        startUrl: (og && og.type !== "website" && og.url) || origin,
        scope: origin + "/",
        icon: (apple && this.findBestIcon(apple.icons, origin)) || (og && this.normalizeUrl(og.image, origin))
      };
    }
    return null;
  }

  static findBestIcon(icons, origin) {
    if (!icons || !icons.length) {
      return null;
    }
    const mapped = icons.map((icon) => {
      let src = icon.src;
      return {
        size: parseInt(icon.sizes, 10),
        src: src
      };
    }, this);
    mapped.sort((a, b) => {
      return b.size - a.size;
    });
    return this.normalizeUrl(mapped[0].src, origin);
  }

  static normalizeUrl(url, origin) {
    if (/^https?:|^\/\//.test(url)) {
      return url;
    }
    if (!/^\//.test(url)) {
      url = "/" + url;
    }
    return origin + url;
  }
}

function didScrape(tab, scraped) {
  const app = scraped ? App.fromScrape(scraped) : null;
  if (!app) {
    appTabs.delete(tab);
    button.state(tab, {
      icon: {
        "32": "./pin-32.png"
      },
      badge: ""
    });
  } else {
    appTabs.set(tab, app);
    db.writeHistory(app.serialize());
    button.state(tab, {
      icon: {
        "32": "./pin-active-32.png"
      },
      badge: "1"
    });
  }
}

const panel = Panel({
  contentURL: data.url("panel/index.html"),
  onHide: function handlePanelHide() {
    button.state("window", {
      checked: false
    });
  },
  contentScriptFile: data.url("panel/index.js"),
  contentStyleFile: data.url("panel/index.css")
});
panel.on("show", () => {
  const app = appTabs.get(tabs.activeTab);
  panel.port.emit("init", {
    app: app ? app.serialize() : null,
    installed: db.findAllApps(),
    recent: db.findRecentHistory()
  });
});
panel.port.emit("init", {});
panel.port.on("pinApp", (details) => {
  const app = App.fromHistory(details.scope);
  console.log("pinApp", app);
  if (app) {
    app.pin();
  }
});
panel.port.on("unpinApp", (details) => {
  const app = App.fromInstalled(details.scope);
  console.log("unpinApp", app);
  if (app) {
    app.unpin();
  }
});
panel.port.on("launchApp", (details) => {
  const app = App.fromInstalled(details.scope);
  if (app) {
    panel.hide();
    app.launch();
  }
});

const button = ToggleButton({
  id: "wanaaa",
  label: "Web Apps",
  icon: {
    "32": "./pin-32.png"
  },
  onChange: function handleButtonChange(state) {
    if (state.checked) {
      panel.show({
        position: button
      });
    }
  },
  badge: ""
});

// tabs.on("pageshow", function onPageshow(tab) {
//   App.fromUrl(tab.url);
// });

PageMod({
  include: ["*"],
  contentScriptWhen: "start",
  contentScriptFile: [
    data.url("page-mod/index.js")
  ],
  attachTo: ["top"],
  onAttach: function handleAttach(worker) {
    const tab = worker.tab;
    if (!tab) {
      return;
    }
    worker.port.on("didScrape", function onDidScrape(details) {
      log("didScrape", details);
      didScrape(tab, details);
    });
    worker.port.on("didActivate", function onDidActivate(details) {
      log("didActivate", details);
    });
    // worker.on("detach", function() {
    //   workers.delete(worker);
    // });
    // workers.add(worker);
  }
});
