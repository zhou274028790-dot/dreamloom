
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { StoryTemplate, StoryPage, VisualStyle } from "../types";

const generateId = () => Math.random().toString(36).substr(2, 9);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const robustJsonParse = (text: string) => {
  const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON Parse Error. Raw text:", text);
    throw new Error("AI 返回数据格式错误");
  }
};

const getStylePrompt = (style: VisualStyle, customDesc?: string): string => {
  if (style === VisualStyle.CUSTOM && customDesc) return customDesc;
  switch (style) {
    case VisualStyle.WATERCOLOR: return "Soft watercolor illustration, storybook style, delicate edges, vibrant colors.";
    case VisualStyle.OIL_PAINTING: return "Classic oil painting style, rich textures, artistic lighting.";
    case VisualStyle.VINTAGE: return "1950s retro storybook style, muted nostalgic tones, hand-drawn.";
    case VisualStyle.FLAT_ART: return "Modern flat vector illustration, clean lines, organic textures.";
    case VisualStyle.GHIBLI: return "Studio Ghibli anime style, lush environments, cinematic lighting.";
    case VisualStyle.PIXAR_3D: return "3D CGI animation style, Disney Pixar look, vibrant and detailed.";
    case VisualStyle.CRAYON: return "Child-like crayon drawing, thick waxy texture, bright colors.";
    case VisualStyle.PAPER_CUT: return "Layered paper-cut art, distinct shadows, handcrafted collage style.";
    default: return `Style: ${style}.`;
  }
};

export const finalizeVisualScript = async (
  pages: Partial<StoryPage>[], 
  characterDesc: string, 
  characterSeedImage: string,
  style: VisualStyle,
  styleRefImage?: string
): Promise<{ pages: StoryPage[], analyzedCharacterDesc: string, analyzedStyleDesc?: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let analyzedStyleDesc = "";
  if (style === VisualStyle.CUSTOM && styleRefImage) {
    analyzedStyleDesc = await analyzeStyleImage(styleRefImage);
  }
  
  const stylePrompt = getStylePrompt(style, analyzedStyleDesc);
  
  try {
    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: characterSeedImage.split(',')[1], mimeType: 'image/png' } },
          { text: "分析此角色的核心视觉特征（包括服装），用一段简短的中文描述。" }
        ]
      }
    });
    const analyzedDesc = analysisResponse.text?.trim() || characterDesc;

    const scriptResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `角色描述: "${analyzedDesc}"，画风: "${stylePrompt}"。
                 为以下页面生成视觉描述（英文）：
                 ${pages.map((p, i) => `页${i+1}: ${p.text}`).join('\n')}
                 返回 JSON。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            updatedPages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  visualPrompt: { type: Type.STRING }
                },
                required: ["text", "visualPrompt"]
              }
            },
          },
          required: ["updatedPages"],
        },
      },
    });

    const data = robustJsonParse(scriptResponse.text || '{}');
    const finalPages = pages.map((p, idx) => ({
      ...p,
      text: data.updatedPages?.[idx]?.text || p.text,
      visualPrompt: data.updatedPages?.[idx]?.visualPrompt || `${analyzedDesc}, ${stylePrompt}`,
      isGenerating: false
    })) as StoryPage[];

    return { pages: finalPages, analyzedCharacterDesc: analyzedDesc, analyzedStyleDesc };
  } catch (error: any) {
    throw new Error(error.message || "分镜脚本生成失败");
  }
};

export const generateSceneImage = async (
  pageText: string, 
  visualPrompt: string, 
  characterDesc: string, 
  characterImg: string, 
  style: VisualStyle,
  styleDesc?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const stylePrompt = getStylePrompt(style, styleDesc);
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: characterImg.split(',')[1], mimeType: 'image/png' } },
          { text: `Consistent character illustration for a book. Character: ${characterDesc}. Style: ${stylePrompt}. Scene: ${visualPrompt}. High quality, 2D art, no text.` }
        ]
      },
      config: { safetySettings }
    });
    
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("模型未返回图像，请重试。");
  } catch (error: any) {
    if (error.message?.includes("entity was not found")) throw new Error("KEY_EXPIRED");
    throw error;
  }
};

export const editPageImage = async (
  currentImg: string, 
  charImg: string, 
  instruction: string, 
  charDesc: string,
  style: VisualStyle,
  styleDesc?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const stylePrompt = getStylePrompt(style, styleDesc);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: charImg.split(',')[1], mimeType: 'image/png' } },
          { inlineData: { data: currentImg.split(',')[1], mimeType: 'image/png' } },
          { text: `Modify the image based on: "${instruction}". Keep the character consistency: ${charDesc}. Art style: ${stylePrompt}. No text.` }
        ]
      },
      config: { safetySettings }
    });
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("微调重绘失败");
  } catch (error: any) {
    if (error.message?.includes("entity was not found")) throw new Error("KEY_EXPIRED");
    throw error;
  }
};

export const generateStoryOutline = async (idea: string, template: StoryTemplate, image?: string): Promise<{ title: string; pages: Partial<StoryPage>[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];
  if (image) parts.push({ inlineData: { data: image.split(',')[1], mimeType: "image/png" } });
  parts.push({ text: `基于想法 "${idea}" 创作绘本大纲（中文）。模板: ${template}。要求：1封面 + 10正文 + 1封底，共12页。返回 JSON。` });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            pages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["cover", "story", "back"] },
                  text: { type: Type.STRING },
                },
                required: ["type", "text"],
              },
            },
          },
          required: ["title", "pages"],
        },
      },
    });
    const data = robustJsonParse(response.text || '{}');
    return { 
      title: data.title || "未命名故事", 
      pages: (data.pages || []).map((p: any, idx: number) => ({ ...p, id: generateId(), pageNumber: idx + 1 })) 
    };
  } catch (err: any) {
    if (err.message?.includes("entity was not found")) throw new Error("KEY_EXPIRED");
    throw err;
  }
};

export const analyzeStyleImage = async (imageBase64: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/png' } },
          { text: "Describe the artistic style of this image in 20 English words, focusing on medium, lines, and colors." }
        ]
      }
    });
    return response.text?.trim() || "Artistic illustration style";
  } catch (e) {
    return "Hand-painted artistic style";
  }
};

export const generateCharacterOptions = async (description: string, style: VisualStyle, image?: string, styleDesc?: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const stylePrompt = getStylePrompt(style, styleDesc);
  const parts: any[] = [];
  if (image) parts.push({ inlineData: { data: image.split(',')[1], mimeType: 'image/png' } });
  parts.push({ text: `Character design sheet for: ${description}. Multiple poses, white background, no text. Style: ${stylePrompt}.` });
  
  const response = await ai.models.generateContent({ 
    model: 'gemini-2.5-flash-image', 
    contents: { parts }, 
    config: { safetySettings } 
  });
  const images: string[] = [];
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) images.push(`data:image/png;base64,${part.inlineData.data}`);
  }
  if (images.length === 0) throw new Error("角色生成失败");
  return images;
};
