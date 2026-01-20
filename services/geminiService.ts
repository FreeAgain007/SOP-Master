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
            text: "Please provide a concise and professional description of the operation step shown in this image for a product packaging SOP. Use English. The tone should be imperative and instructional, like 'Place the product into the carton' or 'Seal with tape'. Avoid unnecessary introductory phrases.",
          },
        ],
      },
    });

    return response.text?.trim() || "Unable to generate description. Please enter manually.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI Analysis failed. Please check network or enter manually.";
  }
};