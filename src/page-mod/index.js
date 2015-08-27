import Scraper from "./scraper.js";

let timer = 0;
const scraper = new Scraper();
function scrape() {
  timer = 0;
  console.log("Scraper: scraper.run");
  scraper.run()
    .then((meta) => {
      self.port.emit("didScrape", meta);
    })
    .catch((err) => {
      self.port.emit("didScrape", null);
    });
}

function requestScrape() {
  if (timer) {
    window.clearTimeout(timer);
    timer = 0;
  }
  timer = window.setTimeout(scrape, 200);
}

const pushState = window.history.pushState;
window.history.pushState = function(state) {
    const result = pushState.apply(this, arguments);
    requestScrape(scrape);
    return result;
};

window.addEventListener("popstate", function() {
  requestScrape(scrape);
});

document.addEventListener("DOMContentLoaded", function() {
  requestScrape();
});

window.addEventListener("unload", function() {
  if (timer) {
    window.clearTimeout(timer);
    timer = 0;
  }
});
