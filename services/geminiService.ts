import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Converts a File object to a Base64 string.
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Generates a description for a packaging step image using Gemini.
 */
export const generateStepDescription = async (file: File): Promise<string> => {
  try {
    const base64Data = await fileToBase64(file);
    const mimeType = file.type;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: "請簡潔、專業地描述這張圖片中的操作步驟，這是一個產品包裝SOP的其中一步。請使用繁體中文，語氣需像標準作業程序(SOP)指令，例如「將產品放入紙箱中」或「封上膠帶」。不要多餘的開場白。",
          },
        ],
      },
    });

    return response.text?.trim() || "無法產生描述，請手動輸入。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 分析失敗，請檢查網路或手動輸入。";
  }
};
