let currentImageBase64 = "";

// 1. 사이드바 초기화 로직
document.addEventListener("DOMContentLoaded", () => {
  // 저장된 API Key 불러오기
  chrome.storage.local.get(["geminiApiKey"], (result) => {
    if (result.geminiApiKey) {
      document.getElementById("apiKeyInput").value = result.geminiApiKey;
    }
  });

  // background.js에 저장된 캡처 이미지가 있는지 확인 요청
  fetchStoredImage();
});

function fetchStoredImage() {
  chrome.runtime.sendMessage({ action: "getStoredImage" }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response && response.image) {
      applyCapturedImage(response.image);
    }
  });
}

// 2. API Key 저장 (chrome.storage.local에 보관)
document.getElementById("saveApiKeyBtn").addEventListener("click", () => {
  const key = document.getElementById("apiKeyInput").value.trim();
  if (!key) {
    alert("API Key를 입력해주세요.");
    return;
  }
  chrome.storage.local.set({ geminiApiKey: key }, () => {
    alert("Gemini API Key가 성공적으로 저장되었습니다!");
  });
});

// 3. 캡처된 이미지 화면에 표시
function applyCapturedImage(imageDataUrl) {
  const imgEl = document.getElementById("capturedImage");
  const placeholder = document.getElementById("placeholder");
  const resultBox = document.getElementById("resultBox");

  currentImageBase64 = imageDataUrl;
  imgEl.src = currentImageBase64;
  imgEl.style.display = "block";
  placeholder.style.display = "none";

  resultBox.textContent = "영역 캡처가 완료되었습니다. 원하시는 분석 버튼을 누르세요!";
}

// 4. 실시간 수신 리스너 (드래그를 다시 했을 경우 대응)
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "sendCapturedImage" && request.image) {
    applyCapturedImage(request.image);
  }
});

// 5. 프롬프트 버튼 클릭 이벤트 및 Gemini API 호출
document.querySelectorAll(".btn-template").forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    if (!currentImageBase64) {
      alert("먼저 논문 화면에서 영역을 마우스로 드래그해 주세요!");
      return;
    }

    // 클릭 시점에 chrome.storage에서 최신 저장된 API 키를 직접 다시 로드
    const storageData = await chrome.storage.local.get(["geminiApiKey"]);
    const apiKey = storageData.geminiApiKey || document.getElementById("apiKeyInput").value.trim();

    if (!apiKey) {
      alert("상단에 Gemini API Key를 입력하고 [저장] 버튼을 먼저 눌러주세요!");
      return;
    }

    const promptType = e.target.getAttribute("data-type");
    const resultBox = document.getElementById("resultBox");

    resultBox.innerHTML = `<div class="loading">⏳ Gemini AI가 분석 중입니다... 잠시만 기다려주세요.</div>`;
    toggleButtons(false); // API 호출 중 버튼 중복 클릭 차단

    try {
      const promptMap = {
        translate: "이 이미지 영역에 포함된 모든 텍스트 및 논문 문장을 학술 맥락에 맞게 자연스럽고 매끄러운 한국어로 전문 번역해 주세요. 문맥이 어색하지 않도록 직역보다는 자연스러운 학술 번역체를 사용하세요.",
        figure: "이 영역은 논문의 Figure 또는 그래프입니다. X축/Y축의 의미, 데이터의 경향성 및 시각적 핵심 결론을 학부생도 이해하기 쉽게 한국어로 설명해 주세요.",
        concept: "이 영역에 등장하는 전문용어와 학술 개념을 비유를 들어 아주 쉽게 풀어서 한국어로 설명해 주세요.",
        summary: "이 단락/결과의 핵심 내용과 주장을 3개의 불릿포인트로 요약해 주세요.",
        formula: "이 영역에 나타난 수식, 변수(Variable), 물리적 기호들의 의미와 작동 원리를 단계별로 설명해 주세요."
      };

      const selectedPrompt = promptMap[promptType] || promptMap.translate;
      const base64Data = currentImageBase64.replace(/^data:image\/(png|jpeg);base64,/, "");

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
        if (data.error.code === 429 || data.error.message.includes("Quota exceeded")) {
          const matchedProject = data.error.message.match(/project_number:\d+/)?.[0] || "알 수 없음";
          resultBox.textContent = `⚠️ API 요청 한도가 초과되었습니다.\n\n[원인]\n- Google Cloud 프로젝트 단위 분당 15회 호출 제한에 걸렸습니다.\n- 현재 요청된 프로젝트 번호: ${matchedProject}\n\n[해결 방법]\n1. Google AI Studio(aistudio.google.com)로 이동합니다.\n2. 'Create API key' 클릭 후 기존 프로젝트가 아닌 'Create API key in NEW project'를 선택하여 새 프로젝트로 키를 만듭니다.\n3. 상단에 새로 발급받은 키를 입력 후 [저장]을 누르고 30초 뒤에 다시 시도해 주세요.`;
        } else {
          resultBox.textContent = "❌ Gemini API 오류: " + data.error.message;
        }
      } else {
        resultBox.textContent = "❌ 분석 결과를 불러오지 못했습니다.";
      }
    } catch (err) {
      resultBox.textContent = "⚠️ 통신 오류 발생: " + err.message;
    } finally {
      toggleButtons(true); // 버튼 다시 활성화
    }
  });
});

// 버튼 활성화/비활성화 제어
function toggleButtons(enable) {
  document.querySelectorAll(".btn-template").forEach((btn) => {
    btn.disabled = !enable;
  });
}