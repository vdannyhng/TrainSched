// Clickjacking-Schutz (OWASP „Legacy Browser Frame Breaking“): Die Seite ist per CSS unsichtbar,
// bis dieses Skript bestätigt, dass sie nicht in einem fremden Frame läuft. Ein Sandbox-iframe ohne
// Skripte lässt die Seite also leer. (EAS Hosting kann für statische Seiten keine X-Frame-Options setzen.)
(function () {
  if (window.self === window.top) {
    const guard = document.getElementById('anti-clickjack');
    if (guard) guard.parentNode.removeChild(guard);
  } else {
    try {
      window.top.location = window.self.location.href;
    } catch {
      /* fremder Ursprung: Seite bleibt unsichtbar */
    }
  }
})();
