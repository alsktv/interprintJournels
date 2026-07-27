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