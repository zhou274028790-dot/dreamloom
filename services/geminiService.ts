
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { StoryTemplate, StoryPage, VisualStyle } from "../types";

const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * 助手：确保数据是 Base64。如果是 URL，则抓取并转换。
 */
const ensureBase64 = async (imgData: string): Promise<string> => {
  if (imgData.startsWith('data:')) {
    return imgData.split(',')[1];
  }
  try {
    const resp = await fetch(imgData);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Failed to convert image URL to base64:", e);
    throw new Error("无法处理参考图片数据，请尝试重新上传。");
  }
};

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
  const charBase64 = await ensureBase64(characterSeedImage);
  
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
          { inlineData: { data: charBase64, mimeType: 'image/png' } },
          { text: "分析此角色的核心视觉特征（包括服装），用一段简短的中文描述。" }
        ]
      }
    });
    const analyzedDesc = analysisResponse.text?.trim() || characterDesc;

    const scriptResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `角色描述: "${analyzedDesc}"，画风: "${stylePrompt}"。
                 为以下页面生成视觉分镜提示词（英文）：
                 ${pages.map((p, i) => `页${i+1}: ${p.text}`).join('\n')}
                 仅返回 JSON，包含 updatedPages: [{text, visualPrompt}]。`,
      config: { responseMimeType: "application/json" }
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
  const charBase64 = await ensureBase64(characterImg);
  const stylePrompt = getStylePrompt(style, styleDesc);
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: charBase64, mimeType: 'image/png' } },
          { text: `Consistent character illustration for a children's book. Character characteristics: ${characterDesc}. Art style: ${stylePrompt}. Current Scene: ${visualPrompt}. High quality art, center composition, no text.` }
        ]
      },
      config: { safetySettings, imageConfig: { aspectRatio: "1:1" } }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("模型未返回图像");
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
  const charBase64 = await ensureBase64(charImg);
  const currentBase64 = await ensureBase64(currentImg);
  const stylePrompt = getStylePrompt(style, styleDesc);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: charBase64, mimeType: 'image/png' } },
          { inlineData: { data: currentBase64, mimeType: 'image/png' } },
          { text: `Modify the second image based on this instruction: "${instruction}". Keep the main character identical to the first reference (${charDesc}). Maintain art style: ${stylePrompt}. No text.` }
        ]
      },
      config: { safetySettings, imageConfig: { aspectRatio: "1:1" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
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
  parts.push({ text: `基于想法 "${idea}" 创作绘本大纲。模板: ${template}。要求：1封面 + 10正文 + 1封底，总计12页。返回 JSON，包含 title 和 pages: [{type, text}]。` });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: { responseMimeType: "application/json" }
    });
    const data = robustJsonParse(response.text || '{}');
    return { 
      title: data.title || "未命名故事", 
      pages: (data.pages || []).map((p: any, idx: number) => ({ ...p, id: generateId(), pageNumber: idx + 1 })) 
    };
  } catch (err: any) {
    throw err;
  }
};

export const analyzeStyleImage = async (imageBase64: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'image/png' } },
          { text: "Analyze the art style of this image. Describe the medium, brushstrokes, color palette and overall mood in 25 words or less for a stable diffusion prompt." }
        ]
      }
    });
    return response.text?.trim() || "Hand-painted artistic style";
  } catch (e) {
    return "Custom artistic illustration style";
  }
};

export const generateCharacterOptions = async (description: string, style: VisualStyle, image?: string, styleDesc?: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const stylePrompt = getStylePrompt(style, styleDesc);
  const parts: any[] = [];
  if (image) parts.push({ inlineData: { data: image.split(',')[1], mimeType: 'image/png' } });
  parts.push({ text: `Character design sheet for: ${description}. Multiple poses, white background, no text. Art style: ${stylePrompt}.` });
  
  const response = await ai.models.generateContent({ 
    model: 'gemini-2.5-flash-image', 
    contents: { parts }, 
    config: { safetySettings, imageConfig: { aspectRatio: "1:1" } } 
  });
  const images: string[] = [];
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) images.push(`data:image/png;base64,${part.inlineData.data}`);
  }
  if (images.length === 0) throw new Error("角色生成失败");
  return images;
};
