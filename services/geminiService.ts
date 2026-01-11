
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { StoryTemplate, StoryPage, VisualStyle } from "../types";

const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * 健壮的图片预处理：
 * 1. 处理 URL 或 Base64。
 * 2. 压缩图片大小（Gemini inlineData 对载荷有严格限制）。
 */
const prepareImageForAi = async (imgData: string): Promise<string> => {
  if (!imgData) throw new Error("缺少图片数据");

  // 如果已经是合法的 base64 且体积较小，直接返回
  if (imgData.startsWith('data:') && imgData.length < 500000) {
    return imgData.split(',')[1];
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 768; // 限制尺寸以减小体积
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      // 降低质量以确保不超出 API 限制
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
      resolve(compressedBase64.split(',')[1]);
    };
    img.onerror = () => reject(new Error("图片加载失败，请尝试重新上传"));
    img.src = imgData;
  });
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const handleAiError = (error: any) => {
  console.error("Gemini API Error:", error);
  const msg = error.message || "";
  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
    throw new Error("API 调用配额已达上限，请稍后再试或更换 API Key。");
  }
  if (msg.includes("INVALID_ARGUMENT") || msg.includes("400")) {
    throw new Error("图片数据过大或格式不正确，已尝试自动修复，请重试。");
  }
  throw error;
};

const robustJsonParse = (text: string) => {
  const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    throw new Error("AI 返回数据解析失败");
  }
};

const getStylePrompt = (style: VisualStyle, customDesc?: string): string => {
  if (style === VisualStyle.CUSTOM && customDesc) return customDesc;
  switch (style) {
    case VisualStyle.WATERCOLOR: return "Soft watercolor illustration, storybook style, high quality.";
    case VisualStyle.OIL_PAINTING: return "Classic oil painting, rich texture, cinematic lighting.";
    case VisualStyle.VINTAGE: return "Retro 1950s storybook style, muted nostalgic tones.";
    case VisualStyle.FLAT_ART: return "Modern vector flat art, organic textures, professional.";
    case VisualStyle.GHIBLI: return "Studio Ghibli anime style, lush landscapes, soft lighting.";
    case VisualStyle.PIXAR_3D: return "Disney 3D CGI style, vibrant lighting, subsurface scattering.";
    case VisualStyle.CRAYON: return "Child-like crayon strokes, waxy texture, bright colors.";
    case VisualStyle.PAPER_CUT: return "Layered paper-cut art, depth shadows, handcrafted look.";
    default: return style;
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
  const charBase64 = await prepareImageForAi(characterSeedImage);
  
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
          { inlineData: { data: charBase64, mimeType: 'image/jpeg' } },
          { text: "简要描述此角色的外貌特征（中文）。" }
        ]
      }
    });
    const analyzedDesc = analysisResponse.text?.trim() || characterDesc;

    const scriptResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `角色: ${analyzedDesc}, 画风: ${stylePrompt}. 生成以下页面的英文生图提示词: ${pages.map(p => p.text).join('|')}. 返回 JSON: {updatedPages: [{text, visualPrompt}]}`,
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
  } catch (error) {
    return handleAiError(error);
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
  const charBase64 = await prepareImageForAi(characterImg);
  const stylePrompt = getStylePrompt(style, styleDesc);
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: charBase64, mimeType: 'image/jpeg' } },
          { text: `Picture book scene. Character: ${characterDesc}. Style: ${stylePrompt}. Action: ${visualPrompt}. 2D illustration, no text.` }
        ]
      },
      config: { safetySettings }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
    }
    throw new Error("AI 未能生成图像");
  } catch (error) {
    return handleAiError(error);
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
  const charBase64 = await prepareImageForAi(charImg);
  const currentBase64 = await prepareImageForAi(currentImg);
  const stylePrompt = getStylePrompt(style, styleDesc);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: charBase64, mimeType: 'image/jpeg' } },
          { inlineData: { data: currentBase64, mimeType: 'image/jpeg' } },
          { text: `Modify the second image based on: ${instruction}. Keep character as in first image (${charDesc}). Style: ${stylePrompt}.` }
        ]
      },
      config: { safetySettings }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
    }
    throw new Error("微调失败");
  } catch (error) {
    return handleAiError(error);
  }
};

export const generateStoryOutline = async (idea: string, template: StoryTemplate, image?: string): Promise<{ title: string; pages: Partial<StoryPage>[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];
  if (image) {
    const imgBase64 = await prepareImageForAi(image);
    parts.push({ inlineData: { data: imgBase64, mimeType: "image/jpeg" } });
  }
  parts.push({ text: `基于 "${idea}" 创作12页绘本大纲（1封面,10正文,1封底）。返回 JSON: {title, pages: [{type, text}]}` });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: { responseMimeType: "application/json" }
    });
    const data = robustJsonParse(response.text || '{}');
    return { title: data.title, pages: (data.pages || []).map((p: any, idx: number) => ({ ...p, id: generateId(), pageNumber: idx + 1 })) };
  } catch (err) {
    return handleAiError(err);
  }
};

export const analyzeStyleImage = async (imageBase64: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = await prepareImageForAi(imageBase64);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
          { text: "Describe the art style of this image for a generator prompt (English, 20 words)." }
        ]
      }
    });
    return response.text?.trim() || "Artistic illustration";
  } catch (e) {
    return "Custom art style";
  }
};

export const generateCharacterOptions = async (description: string, style: VisualStyle, image?: string, styleDesc?: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const stylePrompt = getStylePrompt(style, styleDesc);
  const parts: any[] = [];
  if (image) {
    const imgBase64 = await prepareImageForAi(image);
    parts.push({ inlineData: { data: imgBase64, mimeType: 'image/jpeg' } });
  }
  parts.push({ text: `Character sheet for: ${description}. Multiple poses, white background. Style: ${stylePrompt}.` });
  
  try {
    const response = await ai.models.generateContent({ 
      model: 'gemini-2.5-flash-image', 
      contents: { parts }, 
      config: { safetySettings } 
    });
    const images: string[] = [];
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) images.push(`data:image/jpeg;base64,${part.inlineData.data}`);
    }
    return images;
  } catch (err) {
    return handleAiError(err);
  }
};
