import {data} from "sdk/self";
import tabs from "sdk/tabs";
import {PageMod} from "sdk/page-mod";
import {Panel} from "sdk/panel";
import {ToggleButton} from "sdk/ui/button/toggle";
import {storage} from "sdk/simple-storage";

let pinnablesByTab = new WeakMap();
let appsByTab = new WeakMap();

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

class Pinnable {
  constructor(meta) {
    this.meta = meta;
    this.appView = this.findApp();
    this.appView.host = this.appView.url.replace(/.*?\/\/(www\.)?|\/.*/ig, "");
  }

  findApp() {
    const {manifest, og, apple, origin} = this.meta;
    if (manifest) {
      return {
        source: "manifest",
        name: manifest.name,
        url: origin + (manifest.start_url || "/"),
        icon: this.findIcon(manifest.icons, this.meta)
      };
    }
    if (og && og.site_name) {
      return {
        source: "og",
        name: og.title,
        short_name: og.site_name,
        url: og.url,
        icon: og.image
      };
    }
    if (apple) {
      return {
        source: "apple",
        name: apple.title,
        url: origin,
        icon: this.findIcon(apple.icons)
      };
    }
  }

  findIcon(icons) {
    if (!icons || !icons.length) {
      return null;
    }
    const mapped = icons.map((icon) => {
      let src = icon.src;
      if (src.startsWith("/")) {
        src = this.meta.origin + src;
      }
      return {
        size: parseInt(icon.sizes, 10),
        src: src
      };
    });
    mapped.sort((a, b) => {
      return b.size - a.size;
    });
    return icons[0].src;
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
  const pinnable = pinnablesByTab.get(tabs.activeTab);
  panel.port.emit("init", {
    pinnable: pinnable ? pinnable.appView : null,
    installed: [],
    app: null
  });
});

function didScrape(tab, meta) {
  if (!meta) {
    pinnablesByTab.delete(tab);
    button.state(tab, {
      icon: {
        "32": "./pin-32.png"
      },
      badge: ""
    });
  } else {
    const pinnable = new Pinnable(meta);
    pinnablesByTab.set(tab, pinnable);
    button.state(tab, {
      icon: {
        "32": "./pin-active-32.png"
      },
      badge: "App"
    });
  }
}

const workers = new Set();

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
    const host = tab.url.split("://")[1];
    worker.port.on("didScrape", function(details) {
      didScrape(tab, details);
    });
    worker.on("detach", function() {
      workers.delete(worker);
    });
    workers.add(worker);
  }
});
