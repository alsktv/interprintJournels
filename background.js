// content.js로부터 캡처 요청을 받으면 현재 탭의 화면을 이미지화
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "captureTab") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      sendResponse({ dataUrl: dataUrl });
    });
    return true; // 비동기 응답 처리
  }
  
  if (request.action === "openSidePanel") {
    chrome.sidePanel.open({ tabId: sender.tab.id });
  }
});