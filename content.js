(function () {
  "use strict";

  const LOG_PREFIX = "[browser-color-mode-toggle]";

  function log(message, details) {
    if (details === undefined) {
      console.log(LOG_PREFIX, message);
      return;
    }

    console.log(LOG_PREFIX, message, details);
  }

  function isToggleShortcut(event) {
    return (
      event.ctrlKey &&
      event.shiftKey &&
      !event.altKey &&
      !event.metaKey &&
      event.key.toLowerCase() === "y"
    );
  }

  document.addEventListener(
    "keydown",
    (event) => {
      if (!isToggleShortcut(event)) {
        return;
      }

      log("Content script captured toggle shortcut", {
        url: window.location.href
      });
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      chrome.runtime.sendMessage(
        {
          type: "toggle-color-scheme-shortcut",
          source: "content-script"
        },
        () => {
          if (chrome.runtime.lastError) {
            log("Failed to send toggle message", {
              message: chrome.runtime.lastError.message
            });
          }
        }
      );
    },
    true
  );
})();
