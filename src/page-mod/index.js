import Scraper from "./scraper.js";

let timer = 0;
const scraper = new Scraper();

function scrape() {
  timer = 0;
  console.log("[/pagemod] Scraper: scraper.run");
  scraper.run()
    .then((meta) => {
      self.port.emit("didScrape", meta);
    })
    .catch(() => {
      self.port.emit("didScrape", null);
    });
}

function willScrape() {
  if (timer) {
    window.clearTimeout(timer);
    timer = 0;
  }
  timer = window.setTimeout(scrape, 200);
}

const pushState = window.history.pushState;
window.history.pushState = function() {
    const result = pushState.apply(this, arguments);
    willScrape(scrape);
    return result;
};
window.addEventListener("popstate", function() {
  willScrape(scrape);
});

const knownRegistrations = new WeakSet();

function didSubscribe(registration) {
  console.log("[/pagemod] didSubscribe", registration.scope);
  self.port.emit("didSubscribe");
}

function didActivate() {
  console.log("[/pagemod] didActivate");
  window.navigator.serviceWorker.getRegistrations().then(function(registrations) {
    const added = registrations.filter((registration) => {
      if (knownRegistrations.has(registration)) {
        return false;
      }
      const cb = didSubscribe.bind(null, registration);
      registration.pushManager.addEventListener("pushsubscriptionchange", cb);
      knownRegistrations.add(registration);
      return true;
    });
    const scopes = registrations.map(registration => registration.scope);
    const controller = navigator.serviceWorker.controller;
    console.log("[/pagemod] didActivate");
    self.port.emit("didActivate", {
      registrations: scopes,
      added: added,
      controller: controller ? controller.scriptURL : null
    });
  });
}

window.navigator.serviceWorker.addEventListener("controllerchange", didActivate);
if (navigator.serviceWorker.controller) {
  didActivate();
}

if (document.readyState !== "loading") {
  willScrape();
} else {
  document.addEventListener("DOMContentLoaded", function() {
    willScrape();
  });
}
window.addEventListener("unload", function() {
  if (timer) {
    window.clearTimeout(timer);
    timer = 0;
  }
});
