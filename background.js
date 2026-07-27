let storedCroppedImage = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. 탭 화면 캡처
  if (request.action === "captureTab") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      sendResponse({ dataUrl: dataUrl });
    });
    return true; // 비동기 응답 처리 필수
  }

  // 2. 사이드바 열기 요청
  if (request.action === "openSidePanel") {
    if (sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    }
  }

  // 3. 자른 이미지 저장
  if (request.action === "storeCroppedImage") {
    storedCroppedImage = request.image;
    // 사이드바에 실시간으로도 전송 시도
    chrome.runtime.sendMessage({
      action: "sendCapturedImage",
      image: storedCroppedImage
    }).catch(() => {}); // 사이드바가 아직 안 열렸을 때 생기는 오류 무시
  }

  // 4. 사이드바에서 이미지 요청할 때 전달
  if (request.action === "getStoredImage") {
    sendResponse({ image: storedCroppedImage });
    return true;
  }
});