(() => {
  const panel = document.querySelector("[data-chat]");
  const launcher = document.querySelector("[data-chat-open]");
  const closeButton = document.querySelector("[data-chat-close]");
  if (!panel || !launcher || !closeButton) {
    console.error("Clyffy chat controls are missing.");
    return;
  }
  const close = () => {
    panel.hidden = true;
    launcher.hidden = false;
    launcher.focus();
  };
  closeButton.addEventListener("click", close);
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
    }
  });
  launcher.addEventListener("click", () => {
    panel.hidden = false;
    launcher.hidden = true;
    panel.querySelector("details").open = true;
    panel.querySelector("summary").focus();
  });
})();
