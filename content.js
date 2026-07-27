(function () {
  if (window.hasPaperAssistant) return;
  window.hasPaperAssistant = true;

  // 1. 우측 하단 플로팅 버튼 생성
  const floatBtn = document.createElement("button");
  floatBtn.id = "paper-assistant-btn";
  floatBtn.innerText = "🔍 논문 AI 분석";
  Object.assign(floatBtn.style, {
    position: "fixed",
    bottom: "30px",
    right: "30px",
    zIndex: "999999",
    padding: "12px 18px",
    backgroundColor: "#1a73e8",
    color: "#fff",
    border: "none",
    borderRadius: "25px",
    fontWeight: "bold",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
    transition: "transform 0.2s"
  });

  floatBtn.addEventListener("mouseover", () => floatBtn.style.transform = "scale(1.05)");
  floatBtn.addEventListener("mouseout", () => floatBtn.style.transform = "scale(1)");
  document.body.appendChild(floatBtn);

  // 2. 버튼 클릭 시 드래그 영역 오버레이
  floatBtn.addEventListener("click", () => {
    startSelectionMode();
  });

  function startSelectionMode() {
    const overlay = document.createElement("div");
    overlay.id = "paper-selection-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      zIndex: "9999999",
      cursor: "crosshair"
    });

    const selectionBox = document.createElement("div");
    Object.assign(selectionBox.style, {
      position: "absolute",
      border: "2px dashed #1a73e8",
      backgroundColor: "rgba(26, 115, 232, 0.15)",
      pointerEvents: "none",
      display: "none"
    });
    overlay.appendChild(selectionBox);
    document.body.appendChild(overlay);

    let startX, startY, isDragging = false;

    overlay.addEventListener("mousedown", (e) => {
      startX = e.clientX;
      startY = e.clientY;
      isDragging = true;
      selectionBox.style.left = `${startX}px`;
      selectionBox.style.top = `${startY}px`;
      selectionBox.style.width = "0px";
      selectionBox.style.height = "0px";
      selectionBox.style.display = "block";
    });

    overlay.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const currentX = e.clientX;
      const currentY = e.clientY;

      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);

      selectionBox.style.width = `${width}px`;
      selectionBox.style.height = `${height}px`;
      selectionBox.style.left = `${left}px`;
      selectionBox.style.top = `${top}px`;
    });

    overlay.addEventListener("mouseup", (e) => {
      if (!isDragging) return;
      isDragging = false;

      const rect = {
        x: parseInt(selectionBox.style.left),
        y: parseInt(selectionBox.style.top),
        width: parseInt(selectionBox.style.width),
        height: parseInt(selectionBox.style.height)
      };

      document.body.removeChild(overlay);

      if (rect.width > 20 && rect.height > 20) {
        cropAndCapture(rect);
      }
    });
  }

  // 3. 선택한 영역 자르기
  function cropAndCapture(rect) {
    chrome.runtime.sendMessage({ action: "captureTab" }, (response) => {
      if (!response || !response.dataUrl) return;

      const img = new Image();
      img.src = response.dataUrl;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        ctx.drawImage(
          img,
          rect.x * dpr,
          rect.y * dpr,
          rect.width * dpr,
          rect.height * dpr,
          0,
          0,
          rect.width * dpr,
          rect.height * dpr
        );

        const croppedDataUrl = canvas.toDataURL("image/png");

        chrome.runtime.sendMessage({ action: "openSidePanel" });
        setTimeout(() => {
          chrome.runtime.sendMessage({
            action: "sendCapturedImage",
            image: croppedDataUrl
          });
        }, 300);
      };
    });
  }
})();