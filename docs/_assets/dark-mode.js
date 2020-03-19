try {
  var darkModePref = "dark-mode";
  if (window.localStorage.getItem(darkModePref) === "yes") {
    document.body.parentNode.setAttribute("class", "dark-mode");
  }

  var toggles = document.querySelectorAll(".light-dark-toggle");
  for (var i = 0; i < toggles.length; i++) {
    toggles[i].onclick = function() {
      var current = window.localStorage.getItem(darkModePref);
      var next = current === "yes" ? "no" : "yes";
      window.localStorage.setItem(darkModePref, next);
      window.location.reload();
    };
  }
} catch (_ohWellNoDarkMode) {}
