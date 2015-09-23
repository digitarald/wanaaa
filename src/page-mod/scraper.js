export default class Scraper {
  constructor() {
    this.results = null;
  }

  run() {
    const results = {
      origin: window.location.origin,
      url: window.location.href,
      title: window.title
    };
    const canonical = document.head.querySelector("link[rel='canonical']");
    if (canonical) {
      results.canonical = canonical.href;
    }
    const icons = this.processIconLinks("link[rel='icon']", 32);
    if (icons.length) {
      results.icons = icons;
    }
    return Promise.all([
      this.queryManifest(results),
      this.queryOG(results),
      this.queryApple(results)
    ]).then(() => {
      if (JSON.stringify(this.results) === JSON.stringify(results)) {
        return Promise.reject("No change");
      }
      this.results = results;
      if (!Object.keys(results).length) {
        return Promise.reject("Empty");
      }
      return Promise.resolve(results);
    });
  }

  queryManifest(results) {
    const manifest = document.head.querySelector("link[rel='manifest']");
    if (!manifest) {
      return true;
    }
    const src = manifest.href;
    if (!src) {
      return Promise.resolve();
    }
    const init = {};
    if (manifest.crossOrigin === "use-credentials") {
      init.credentials = "include";
    }
    const result = {};
    const request = new Request(src, init);
    return fetch(request).then((response) => {
      result.responseUrl = response.url;
      return response.json();
    }).then((parsed) => {
      result.response = parsed;
      results.manifest = result;
      return Promise.resolve();
    }).catch((error) => {
      console.warn("Could not fetch manifest", src, error);
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
    const ns = this.getOGNamespace();
    const result = {};
    for (let element of Array.from(document.head.querySelectorAll(`meta[property^='${ns}']`))) {
      const property = element.getAttribute("property").slice(ns.length);
      const value = element.getAttribute("content");
      if (!result.hasOwnProperty(property)) {
        result[property] = [];
      }
      result[property].push(value);
    }
    if (!Object.keys(result).length) {
      return;
    }
    // Flatten result
    for (let property of Object.keys(result)) {
      const value = result[property];
      result[property] = (value.length > 1) ? value : value[0];
    }
    results.og = result;
  }

  queryApple(results) {
    const icons = this.processIconLinks("link[rel^='apple-touch-icon']", 60);
    if (!icons.length) {
      return;
    }
    const result = {
      icons: icons
    };
    const title = document.querySelector("meta[name='apple-mobile-web-app-title']");
    if (title) {
      result.title = title.content;
    }
    results.apple = result;
  }

  processIconLinks(selector, size) {
    return Array.map(document.head.querySelectorAll(selector), (link) => {
      // W3C Manifest icon format
      return {
        sizes: parseInt(link.getAttribute("sizes"), 10) || size,
        src: link.href
      };
    });
  }
}
