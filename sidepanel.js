let currentImageBase64 = "";

// 1. 저장된 API Key 로드
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["geminiApiKey"], (result) => {
    if (result.geminiApiKey) {
      document.getElementById("apiKeyInput").value = result.geminiApiKey;
    }
  });
});

// 2. API Key 저장
document.getElementById("saveApiKeyBtn").addEventListener("click", () => {
  const key = document.getElementById("apiKeyInput").value.trim();
  if (!key) {
    alert("API Key를 입력해주세요.");
    return;
  }
  chrome.storage.local.set({ geminiApiKey: key }, () => {
    alert("Gemini API Key가 저장되었습니다!");
  });
});

// 3. 캡처 이미지 수신
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "sendCapturedImage") {
    const imgEl = document.getElementById("capturedImage");
    const placeholder = document.getElementById("placeholder");
    const resultBox = document.getElementById("resultBox");

    currentImageBase64 = request.image;
    imgEl.src = currentImageBase64;
    imgEl.style.display = "block";
    placeholder.style.display = "none";

    resultBox.textContent = "영역 캡처가 완료되었습니다. 분석 버튼을 누르세요!";
  }
});

// 4. 프롬프트 버튼 클릭 이벤트 및 Gemini API 직접 호출
document.querySelectorAll(".btn-template").forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    if (!currentImageBase64) {
      alert("먼저 논문 화면에서 영역을 마우스로 드래그해 주세요!");
      return;
    }

    const apiKey = document.getElementById("apiKeyInput").value.trim();
    if (!apiKey) {
      alert("상단에 Gemini API Key를 먼저 입력하고 저장해 주세요!");
      return;
    }

    const promptType = e.target.getAttribute("data-type");
    const resultBox = document.getElementById("resultBox");

    resultBox.innerHTML = `<div class="loading">⏳ Gemini AI가 직접 분석 중입니다... 잠시만 기다려주세요.</div>`;
    toggleButtons(false);

    try {
      const promptMap = {
        figure: "이 영역은 논문의 Figure 또는 그래프입니다. X축/Y축의 의미, 데이터의 경향성 및 시각적 핵심 결론을 학부생도 이해하기 쉽게 한국어로 설명해 주세요.",
        concept: "이 영역에 등장하는 전문용어와 학술 개념을 비유를 들어 아주 쉽게 풀어서 한국어로 설명해 주세요.",
        summary: "이 단락/결과의 핵심 내용과 주장을 3개의 불릿포인트로 요약해 주세요.",
        formula: "이 영역에 나타난 수식, 변수(Variable), 물리적 기호들의 의미와 작동 원리를 단계별로 설명해 주세요."
      };

      const selectedPrompt = promptMap[promptType] || promptMap.summary;
      const base64Data = currentImageBase64.replace(/^data:image\/(png|jpeg);base64,/, "");

      // Gemini 1.5 Flash API 직접 호출
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: selectedPrompt },
              { inline_data: { mime_type: "image/png", data: base64Data } }
            ]
          }]
        })
      });

      const data = await response.json();

      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        resultBox.textContent = data.candidates[0].content.parts[0].text;
      } else if (data.error) {
        resultBox.textContent = "❌ Gemini API 오류: " + data.error.message;
      } else {
        resultBox.textContent = "❌ 분석 결과를 불러오지 못했습니다.";
      }
    } catch (err) {
      resultBox.textContent = "⚠️ 통신 오류 발생: " + err.message;
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