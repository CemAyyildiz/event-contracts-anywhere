(function () {
  var s = document.currentScript;
  if (!s) return;
  var host = s.getAttribute("data-host") || "anonymous";
  var market = s.getAttribute("data-market") || "BTC";
  var srcBase = s.getAttribute("data-src") || s.src.replace(/\/[^/]*$/, "/");
  if (srcBase.slice(-1) !== "/") srcBase += "/";
  // When served from /w.js at vite root, iframe is /
  var iframeSrc =
    srcBase.replace(/\/$/, "") === "" || srcBase.endsWith("//")
      ? "/?host=" + encodeURIComponent(host) + "&market=" + encodeURIComponent(market)
      : srcBase +
        "?host=" +
        encodeURIComponent(host) +
        "&market=" +
        encodeURIComponent(market);

  // Prefer explicit data-src for local demo: data-src="/"
  if (s.getAttribute("data-src") === "/") {
    iframeSrc =
      "/?host=" + encodeURIComponent(host) + "&market=" + encodeURIComponent(market);
  }

  var wrap = document.createElement("div");
  wrap.setAttribute("data-eca-embed", "1");
  wrap.style.cssText = "width:100%;max-width:420px;margin:0 auto;";

  var iframe = document.createElement("iframe");
  iframe.src = iframeSrc;
  iframe.title = "Event Contracts widget";
  iframe.allow = "clipboard-write";
  iframe.style.cssText =
    "width:100%;border:0;border-radius:16px;overflow:hidden;display:block;min-height:420px;background:transparent;box-shadow:0 18px 50px rgba(8,10,14,0.28);";
  wrap.appendChild(iframe);

  s.parentNode.insertBefore(wrap, s);

  window.addEventListener("message", function (ev) {
    if (!ev.data || ev.data.type !== "eca:resize") return;
    if (ev.source !== iframe.contentWindow) return;
    var h = Number(ev.data.height);
    if (h > 0) iframe.style.height = Math.ceil(h) + "px";
  });
})();
