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
    zIndex: "2147483647", // 브라우저 최상단 레이어 보장
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

  // 2. 버튼 클릭 시 드래그 모드 시작
  floatBtn.addEventListener("click", () => {
    // 확장프로그램 컨텍스트 검사
    if (!chrome.runtime?.id) {
      alert("확장프로그램이 업데이트되었습니다. 페이지를 새로고침(F5) 해주세요!");
      return;
    }
    startSelectionMode();
  });

  function startSelectionMode() {
    // 기존 오버레이가 있다면 제거
    const oldOverlay = document.getElementById("paper-selection-overlay");
    if (oldOverlay) oldOverlay.remove();

    const overlay = document.createElement("div");
    overlay.id = "paper-selection-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0, 0, 0, 0.25)",
      zIndex: "2147483646", // 최상위 z-index
      cursor: "crosshair",
      userSelect: "none",
      webkitUserSelect: "none",
      touchAction: "none"
    });

    const selectionBox = document.createElement("div");
    Object.assign(selectionBox.style, {
      position: "fixed",
      border: "2px dashed #1a73e8",
      backgroundColor: "rgba(26, 115, 232, 0.2)",
      pointerEvents: "none",
      display: "none",
      zIndex: "2147483647"
    });
    overlay.appendChild(selectionBox);
    document.body.appendChild(overlay);

    let startX = 0, startY = 0, isDragging = false;

    // 마우스 이벤트 수신
    const onMouseDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      isDragging = true;

      selectionBox.style.left = `${startX}px`;
      selectionBox.style.top = `${startY}px`;
      selectionBox.style.width = "0px";
      selectionBox.style.height = "0px";
      selectionBox.style.display = "block";
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      e.stopPropagation();

      const currentX = e.clientX;
      const currentY = e.clientY;

      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);

      selectionBox.style.left = `${left}px`;
      selectionBox.style.top = `${top}px`;
      selectionBox.style.width = `${width}px`;
      selectionBox.style.height = `${height}px`;
    };

    const onMouseUp = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      e.stopPropagation();
      isDragging = false;

      const rect = {
        x: parseInt(selectionBox.style.left, 10),
        y: parseInt(selectionBox.style.top, 10),
        width: parseInt(selectionBox.style.width, 10),
        height: parseInt(selectionBox.style.height, 10)
      };

      // 이벤트 리스너 및 오버레이 정리
      overlay.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);

      // 최소 유효 드래그 크기 확인 (20px 이상)
      if (rect.width > 20 && rect.height > 20) {
        cropAndCapture(rect);
      }
    };

    overlay.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("mousemove", onMouseMove, true);
    window.addEventListener("mouseup", onMouseUp, true);
  }

  // 3. 영역 자르기 및 사이드바 전송
  function cropAndCapture(rect) {
    if (!chrome.runtime?.id) {
      alert("페이지를 새로고침(F5) 후 다시 시도해 주세요.");
      return;
    }

    try {
      // 1) 사이드바 열기 요청
      chrome.runtime.sendMessage({ action: "openSidePanel" });

      // 2) 탭 캡처
      chrome.runtime.sendMessage({ action: "captureTab" }, (response) => {
        if (chrome.runtime.lastError || !response || !response.dataUrl) {
          console.error("캡처 실패:", chrome.runtime.lastError?.message);
          return;
        }

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

          // 3) 사이드바 로드 대기 후 전송
          setTimeout(() => {
            chrome.runtime.sendMessage({
              action: "sendCapturedImage",
              image: croppedDataUrl
            });
          }, 400);
        };
      });
    } catch (err) {
      console.error("전송 오류:", err);
    }
  }
})();