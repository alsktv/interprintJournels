// 본인의 Cloudflare Worker URL 주소로 변경하세요
const WORKER_URL = "https://interprintjournels.pages.dev";

let currentImageBase64 = "";

// 캡처 이미지 수신
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "sendCapturedImage") {
    const imgEl = document.getElementById("capturedImage");
    const placeholder = document.getElementById("placeholder");
    const resultBox = document.getElementById("resultBox");

    currentImageBase64 = request.image;
    imgEl.src = currentImageBase64;
    imgEl.style.display = "block";
    placeholder.style.display = "none";

    resultBox.textContent = "영역 캡처가 완료되었습니다. 위의 분석 버튼 중 하나를 클릭하세요!";
  }
});

// 프롬프트 버튼 클릭 이벤트
document.querySelectorAll(".btn-template").forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    if (!currentImageBase64) {
      alert("먼저 논문 화면에서 영역을 마우스로 드래그해 주세요!");
      return;
    }

    const promptType = e.target.getAttribute("data-type");
    const resultBox = document.getElementById("resultBox");

    // 로딩 상태 표시
    resultBox.innerHTML = `<div class="loading">⏳ Cloudflare AI 분석 중... 잠시만 기다려주세요.</div>`;
    toggleButtons(false);

    try {
      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: currentImageBase64,
          promptType: promptType
        })
      });

      const data = await response.json();

      if (data.result) {
        resultBox.textContent = data.result;
      } else {
        resultBox.textContent = "❌ 오류 발생: " + (data.error || "분석 실패");
      }
    } catch (err) {
      resultBox.textContent = "⚠️ Cloudflare Workers 통신 오류: " + err.message;
    } finally {
      toggleButtons(true);
    }
  });
});

function toggleButtons(enable) {
  document.querySelectorAll(".btn-template").forEach((btn) => {
    btn.disabled = !enable;
  });
}