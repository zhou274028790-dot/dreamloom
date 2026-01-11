
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { StoryTemplate, StoryPage, VisualStyle } from "../types";

const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * 辅助函数：从 AI 混乱的文本中精准提取 JSON 部分
 */
const extractJson = (text: string) => {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return null;
  }
};

/**
 * 强化版图片预处理：增加静默重试和更好的跨域处理
 * 尝试通过 Fetch 加载，如果失败（如 CORS 问题），则尝试直接通过 Image 对象加载。
 */
const prepareImageForAi = async (imgData: string, retryCount = 0): Promise<string> => {
  if (!imgData) throw new Error("无效的图片数据");

  // 如果是 Base64 数据，直接处理
  if (imgData.startsWith('data:')) {
    return processImageBase64(imgData);
  }

  try {
    const resp = await fetch(imgData, { mode: 'cors', cache: 'no-cache' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const result = await processImageFromUrl(url);
    URL.revokeObjectURL(url);
    return result;
  } catch (e) {
    // 如果 Fetch 失败，尝试直接 Image 加载（可能受限于 canvas 污染，但值得一试）
    try {
      return await processImageFromUrl(imgData);
    } catch (innerError) {
      if (retryCount < 2) return prepareImageForAi(imgData, retryCount + 1);
      throw new Error("图片加载失败，请确保链接有效并允许跨域。");
    }
  }
};

const processImageBase64 = (base64: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 768; 
      let width = img.width;
      let height = img.height;
      if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
      else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error("Canvas context failed"));
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6).split(',')[1]);
    };
    img.onerror = () => reject(new Error("Image decoding failed"));
    img.src = base64;
  });
};

const processImageFromUrl = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 768; 
      let width = img.width;
      let height = img.height;
      if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
      else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error("Canvas context failed"));
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      try {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6).split(',')[1]);
      } catch (e) {
        reject(e); // 可能是 canvas 被污染
      }
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const getStylePrompt = (style: VisualStyle, customDesc?: string): string => {
  if (style === VisualStyle.CUSTOM && customDesc) return customDesc;
  switch (style) {
    case VisualStyle.WATERCOLOR: 
      return "Soft watercolor illustration, wet-on-wet technique, beautiful bleeding effects, heavy cold-press watercolor paper texture, gentle abstract organic shapes, artistic and soothing.";
    case VisualStyle.OIL_PAINTING: 
      return "Expressionist oil painting, visible thick impasto brushstrokes, coarse canvas grain texture, rich oil pigments, artistic textures, atmospheric lighting.";
    case VisualStyle.VINTAGE: 
      return "Retro mid-century storybook illustration, halftone dot texture, aged paper grain, warm nostalgic color palette, gentle character design.";
    case VisualStyle.FLAT_ART: 
      return "Artistic flat vector illustration, organic paper grain noise, subtle textures, soft minimalist abstract characters, professional aesthetic.";
    case VisualStyle.GHIBLI: 
      return "Studio Ghibli style, lush hand-painted background, cinematic lighting, nostalgic anime aesthetic, peaceful atmosphere.";
    case VisualStyle.PIXAR_3D: 
      return "3D CGI character design, Disney Pixar style, soft subsurface scattering, vibrant warm colors, high quality digital art.";
    case VisualStyle.CRAYON: 
      return "Child-like crayon drawing, waxy texture, heavy paper tooth grain, abstract and non-literal character shapes, bright playful coloring.";
    case VisualStyle.PAPER_CUT: 
      return "Layered paper-cut collage art, recycled fiber paper texture, distinct drop shadows for depth, geometric abstract silhouettes.";
    default: return style;
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
          { text: "Analyze this art style thoroughly for children's books. Focus on color palette and textures. Summarize in one English paragraph." }
        ]
      }
    });
    return response.text?.trim() || "Artistic illustration style";
  } catch (e) {
    return "Custom artistic style";
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
          { text: "Describe this character's visual features in 20 Chinese characters." }
        ]
      }
    });
    const analyzedDesc = analysisResponse.text?.trim() || characterDesc;

    const scriptResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Character: ${analyzedDesc}, Style: ${stylePrompt}. Create detailed visual prompts for these plot points: ${pages.map(p => p.text).join('|')}. Return JSON ONLY: {updatedPages: [{text, visualPrompt}]}`,
      config: { responseMimeType: "application/json" }
    });

    const data = extractJson(scriptResponse.text);
    if (!data || !data.updatedPages) throw new Error("Invalid script format from AI");

    const finalPages = pages.map((p, idx) => ({
      ...p,
      text: data.updatedPages?.[idx]?.text || p.text,
      visualPrompt: data.updatedPages?.[idx]?.visualPrompt || `${analyzedDesc}, ${stylePrompt}`,
      isGenerating: false
    })) as StoryPage[];

    return { pages: finalPages, analyzedCharacterDesc: analyzedDesc, analyzedStyleDesc };
  } catch (error) {
    console.error("Script Finalization Error:", error);
    throw new Error("脚本优化失败，请稍后重试。");
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
          { text: `consistent children's book illustration. Character: ${characterDesc}. Style: ${stylePrompt}. Scene: ${visualPrompt}. High quality art, no text.` }
        ]
      },
      config: { safetySettings }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
    }
    throw new Error("No image data returned");
  } catch (error) {
    throw new Error("生成失败: " + error.message);
  }
};

export const editPageImage = async (
  pageImgUrl: string,
  charImg: string,
  instruction: string,
  characterDesc: string,
  style: VisualStyle,
  styleDesc?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const pageBase64 = await prepareImageForAi(pageImgUrl);
  const charBase64 = await prepareImageForAi(charImg);
  const stylePrompt = getStylePrompt(style, styleDesc);
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: pageBase64, mimeType: 'image/jpeg' } },
          { inlineData: { data: charBase64, mimeType: 'image/jpeg' } },
          { text: `Edit instruction: ${instruction}. Keep character consistent: ${characterDesc}. Style: ${stylePrompt}.` }
        ]
      },
      config: { safetySettings }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
    }
    throw new Error("Edit failed");
  } catch (error) {
    throw new Error("微调失败: " + error.message);
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
  parts.push({ text: `Character sheet for: ${description}. Gentle abstract shapes. Style: ${stylePrompt}. White background.` });
  
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
  } catch (error) {
    throw new Error("形象生成失败: " + error.message);
  }
};

export const generateStoryOutline = async (idea: string, template: StoryTemplate, image?: string): Promise<{ title: string; pages: Partial<StoryPage>[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];
  if (image) {
    const imgBase64 = await prepareImageForAi(image);
    parts.push({ inlineData: { data: imgBase64, mimeType: "image/jpeg" } });
  }
  parts.push({ text: `Create a 12-page story outline based on: "${idea}". Template: ${template}. Response language: Chinese. Return JSON ONLY: {title, pages: [{type, text}]}` });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: { responseMimeType: "application/json" }
    });
    
    const data = extractJson(response.text);
    if (!data || !data.pages) throw new Error("Outline parse failed");

    return { 
      title: data.title, 
      pages: (data.pages || []).map((p: any, idx: number) => ({ 
        ...p, 
        id: generateId(), 
        pageNumber: idx + 1 
      })) 
    };
  } catch (err) {
    console.error("Outline Generation Detailed Error:", err);
    throw new Error("大纲生成失败，AI 当前太忙，请换个词试试。");
  }
};
