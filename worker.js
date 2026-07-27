export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const { image, promptType } = await request.json();

      if (!image) {
        return new Response(JSON.stringify({ error: "No image provided" }), {
          status: 400,
          headers: corsHeaders
        });
      }

      // 1. 프롬프트 템플릿 정의
      const promptMap = {
        figure: "이 영역은 논문의 Figure 또는 그래프입니다. X축/Y축의 의미, 데이터의 경향성 및 시각적 핵심 결론을 학부생도 이해하기 쉽게 한국어로 설명해 주세요.",
        concept: "이 영역에 등장하는 전문용어와 학술 개념을 비유를 들어 아주 쉽게 풀어서 한국어로 설명해 주세요.",
        summary: "이 단락/결과의 핵심 내용과 주장을 3개의 불릿포인트로 요약해 주세요.",
        formula: "이 영역에 나타난 수식, 변수(Variable), 물리적 기호들의 의미와 작동 원리를 단계별로 설명해 주세요."
      };

      const selectedPrompt = promptMap[promptType] || promptMap.summary;

      // Base64 Prefix 제거
      const base64Data = image.replace(/^data:image\/(png|jpeg);base64,/, "");

      // 2. Gemini 1.5 Flash Vision API 호출 (Cloudflare Secret의 GEMINI_API_KEY 사용)
      const apiKey = env.GEMINI_API_KEY;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const apiResponse = await fetch(apiUrl, {
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

      const apiData = await apiResponse.json();
      const answer = apiData.candidates?.[0]?.content?.parts?.[0]?.text || "분석 결과를 생성하지 못했습니다.";

      return new Response(JSON.stringify({ result: answer }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};