let storedCroppedImage = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. 탭 화면 캡처
  if (request.action === "captureTab") {
    // windowId를 null 대신 현재 윈도우 ID로 명시적 지정
    chrome.windows.getCurrent((win) => {
      chrome.tabs.captureVisibleTab(win.id, { format: "png" }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error("captureVisibleTab 에러:", chrome.runtime.lastError.message);
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ dataUrl: dataUrl });
        }
      });
    });
    return true; // 비동기 응답 필수
  }

  // 2. 사이드바 열기 요청
  if (request.action === "openSidePanel") {
    if (sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id }).catch((err) => {
        console.error("사이드바 열기 실패:", err);
      });
    }
  }

  // 3. 자른 이미지 저장
  if (request.action === "storeCroppedImage") {
    storedCroppedImage = request.image;
    chrome.runtime.sendMessage({
      action: "sendCapturedImage",
      image: storedCroppedImage
    }).catch(() => {}); // 사이드바 수신 대기 중이 아닐 때 에러 무시
  }

  // 4. 사이드바에서 이미지 요청할 때 전달
  if (request.action === "getStoredImage") {
    sendResponse({ image: storedCroppedImage });
    return true;
  }
});