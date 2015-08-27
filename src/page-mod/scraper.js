export default class Scraper {
  constructor() {
    this.meta = null;
  }

  run() {
    this.runs++;
    const meta = {};
    return Promise.all([
      this.queryManifest(meta),
      this.queryOG(meta),
      this.queryApple(meta)
    ]).then(() => {
      if (JSON.stringify(this.meta) === JSON.stringify(meta)) {
        return Promise.reject("No change");
      }
      this.meta = meta;
      if (!Object.keys(meta).length) {
        return Promise.reject("Empty");
      }
      console.log("Scraper: meta!", meta);
      return Promise.resolve(meta);
    });
  }

  queryManifest(meta) {
    console.log("queryManifest");
    const manifest = document.head.querySelector("link[rel='manifest']");
    if (!manifest) {
      return true;
    }
    const src = manifest.getAttribute("href");
    return fetch(src).then((response) => {
      return response.json();
    }).then((response) => {
      meta.src = src;
      meta.origin = window.location.origin;
      meta.manifest = response;
      return Promise.resolve();
    }).catch((err) => {
      return Promise.resolve();
    });
  }

  getOGNamespace() {
    const ogUrl = /^https?:\/\/(ogp\.me|opengraphprotocol\.org)/;
    const htmls = [document.documentElement, document.head];
    for (let html of htmls) {
      if (!html.hasAttributes()) {
        continue;
      }
      for (let {name, value} of Array.from(html.attributes)) {
        if (name.startsWith("xmlns") && ogUrl.test(value)) {
          return name.slice(6) + ":";
        }
        if (name === "prefix") {
          for (let match of value.match(/[^\s]+([a-z]+):\s+[^\s]+/g)) {
            for (let ns of match.trim().split(/:\s+/)) {
              if (ogUrl.test(ns[1])) {
                return ns[0] + ":";
              }
            }
          }
        }
      }
    }
    return "og:";
  }

  queryOG(results) {
    console.log("queryOG");
    const ns = this.getOGNamespace();
    const meta = {};
    for (let element of Array.from(document.head.querySelectorAll(`meta[property^='${ns}']`))) {
      const property = element.getAttribute("property").slice(ns.length);
      const value = element.getAttribute("content");
      if (!meta.hasOwnProperty(property)) {
        meta[property] = [];
      }
      meta[property].push(value);
    }
    if (!Object.keys(meta).length) {
      return;
    }
    for (let property of Object.keys(meta)) {
      const value = meta[property];
      meta[property] = (value.length > 1) ? value : value[0];
    }
    results.og = meta;
  }

  queryApple(results) {
    console.log("queryApple");
    const links = Array.from(document.head.querySelectorAll("link[rel^='apple-touch-icon'], link[rel='icon']"));
    if (!links.length) {
      return;
    }
    const icons = links.map((link) => {
      // W3C Manifest icon format
      return {
        sizes: link.getAttribute("sizes") || "60x60",
        src: link.getAttribute("href")
      };
    });
    this.source = "apple";
    const meta = {
      title: document.title,
      url: location.href,
      icons: icons
    };
    const canonical = document.querySelector("link[rel='canonical']");
    if (canonical) {
      meta.url = canonical.getAttribute("href");
    }
    const description = document.querySelector("meta[name='description']");
    if (description) {
      meta.description = description.getAttribute("content");
    }
    const title = document.querySelector("meta[name='apple-mobile-web-app-title']");
    if (title) {
      meta.title = title.getAttribute("content");
    }
    meta.origin = window.location.origin;
    results.apple = meta;
    return;
  }
}
