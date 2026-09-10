(function () {
  var s = document.currentScript;
  if (!s) return;
  var host = s.getAttribute("data-host") || "anonymous";
  var market = s.getAttribute("data-market") || "BTC";
  var peek = s.getAttribute("data-peek");
  var path = s.getAttribute("data-src") || "/slip/";
  if (path.slice(-1) !== "/") path += "/";
  var iframeSrc =
    path +
    "?host=" +
    encodeURIComponent(host) +
    "&market=" +
    encodeURIComponent(market);
  if (peek) iframeSrc += "&peek=" + encodeURIComponent(peek);

  var wrap = document.createElement("div");
  wrap.setAttribute("data-eca-embed", "1");
  wrap.style.cssText = "width:100%;max-width:28rem;margin:0 auto;";

  var iframe = document.createElement("iframe");
  iframe.src = iframeSrc;
  iframe.title = "Event Contracts slip";
  iframe.allow = "clipboard-write";
  iframe.style.cssText =
    "width:100%;border:0;overflow:hidden;display:block;min-height:520px;background:#efe6d4;";
  wrap.appendChild(iframe);

  s.parentNode.insertBefore(wrap, s);

  window.addEventListener("message", function (ev) {
    if (!ev.data || ev.data.type !== "eca:resize") return;
    if (ev.source !== iframe.contentWindow) return;
    var h = Number(ev.data.height);
    if (h > 0) iframe.style.height = Math.ceil(h) + "px";
  });
})();
