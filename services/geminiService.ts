
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { StoryTemplate, StoryPage, VisualStyle } from "../types";

const generateId = () => Math.random().toString(36).substr(2, 9);

const extractJson = (text: string) => {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON parsing error", e, text);
    return null;
  }
};

/**
 * 极强鲁棒性的图片预处理：解决云端 URL 跨域和 Base64 读取问题
 */
const prepareImageForAi = async (imgData: string): Promise<string> => {
  if (!imgData) throw new Error("无效的图片数据");
  
  // 1. 如果是 Base64，直接截取内容
  if (imgData.startsWith('data:')) {
    return imgData.split(',')[1];
  }

  // 2. 如果是云端 URL，尝试使用 fetch 获取 Blob（这样更可靠，只要存储桶配置了跨域）
  try {
    const response = await fetch(imgData);
    if (!response.ok) throw new Error("无法从云端下载图片");
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Fetch failed, falling back to Canvas Draw:", e);
    // 3. 后备方案：使用 Image + Canvas
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imgData;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas context failed"));
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        try {
          resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        } catch (err) {
          reject(new Error("浏览器安全策略限制了图片读取，请重新上传参考图"));
        }
      };
      img.onerror = () => reject(new Error("图片资源加载失败，请检查网络"));
    });
  }
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
    case VisualStyle.WATERCOLOR: return "Soft watercolor illustration, wet-on-wet technique, beautiful bleeding effects.";
    case VisualStyle.OIL_PAINTING: return "Classic oil painting, thick impasto brushstrokes, rich textures.";
    case VisualStyle.VINTAGE: return "1950s retro children's book illustration, halftone texture, warm palette.";
    case VisualStyle.FLAT_ART: return "Modern artistic flat illustration, minimalist shapes, soft grain.";
    case VisualStyle.GHIBLI: return "Studio Ghibli anime style, hand-painted backgrounds, cinematic lighting.";
    case VisualStyle.PIXAR_3D: return "3D Disney Pixar style character, soft studio lighting, CGI.";
    case VisualStyle.CRAYON: return "Hand-drawn crayon art, waxy texture, vibrant playful colors.";
    case VisualStyle.PAPER_CUT: return "Artistic paper-cut collage, layered depth, drop shadows.";
    default: return style;
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
  
  // 处理角色参考图
  const charBase64 = await prepareImageForAi(characterImg);
  
  const compositionPrompt = "Ultra-wide 2:1 cinema composition. Dynamic perspective, non-centered. Storybook illustration without any text.";
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', 
    contents: { 
      parts: [
        { inlineData: { data: charBase64, mimeType: 'image/jpeg' } },
        { text: `${compositionPrompt} Character consistency: ${characterDesc}. Style: ${stylePrompt}. Scene: ${visualPrompt}. Narrative: ${pageText}.` }
      ]
    },
    config: { 
      safetySettings,
      imageConfig: { aspectRatio: "16:9" }
    }
  });
  
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) throw new Error("AI 无法根据当前描述生成画面，请尝试修改情节");
  
  for (const part of candidates[0].content.parts) {
    if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
  }
  throw new Error("生成结果异常，请稍后重试");
};

export const analyzeStyleImage = async (imageUrl: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64 = await prepareImageForAi(imageUrl);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: base64, mimeType: 'image/jpeg' } },
        { text: "Describe the artistic style of this style-reference image in 5 key words." }
      ]
    }
  });
  return response.text?.trim() || "";
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
  // 只有自定义风格才分析图片特色
  if (style === VisualStyle.CUSTOM && styleRefImage) {
    analyzedStyleDesc = await analyzeStyleImage(styleRefImage);
  }
  
  const stylePrompt = getStylePrompt(style, analyzedStyleDesc);
  
  const analysisResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: charBase64, mimeType: 'image/jpeg' } },
        { text: "Summarize the character traits of this person in one short sentence for image generation consistency." }
      ]
    }
  });
  const analyzedDesc = analysisResponse.text?.trim() || characterDesc;

  const scriptResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Character: ${analyzedDesc}, Style: ${stylePrompt}. Story: ${pages.map(p => p.text).join('|')}. JSON: {updatedPages: [{text, visualPrompt}]}`,
    config: { responseMimeType: "application/json" }
  });

  const data = extractJson(scriptResponse.text);
  const finalPages = pages.map((p, idx) => ({
    ...p,
    text: data?.updatedPages?.[idx]?.text || p.text,
    visualPrompt: data?.updatedPages?.[idx]?.visualPrompt || `${analyzedDesc}, ${stylePrompt}`,
    isGenerating: false
  })) as StoryPage[];

  return { pages: finalPages, analyzedCharacterDesc: analyzedDesc, analyzedStyleDesc };
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
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: pageBase64, mimeType: 'image/jpeg' } },
        { inlineData: { data: charBase64, mimeType: 'image/jpeg' } },
        { text: `Modify the first image based on: ${instruction}. Consistency with character in second image: ${characterDesc}. Style: ${stylePrompt}. Cinema widescreen.` }
      ]
    },
    config: { imageConfig: { aspectRatio: "16:9" } }
  });
  
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) throw new Error("微调引擎无响应");

  for (const part of candidates[0].content.parts) {
    if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
  }
  throw new Error("微调未生成结果");
};

export const generateCharacterOptions = async (description: string, style: VisualStyle, image?: string, styleDesc?: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const stylePrompt = getStylePrompt(style, styleDesc);
  const parts: any[] = [];
  if (image) {
    const imgBase64 = await prepareImageForAi(image);
    parts.push({ inlineData: { data: imgBase64, mimeType: 'image/jpeg' } });
  }
  parts.push({ text: `Character design sheet for ${description}. Full body, clear backgrounds. Style: ${stylePrompt}.` });
  
  const response = await ai.models.generateContent({ 
    model: 'gemini-2.5-flash-image', 
    contents: { parts }
  });
  const images: string[] = [];
  const candidates = response.candidates;
  if (candidates && candidates.length > 0) {
    for (const part of candidates[0].content.parts) {
      if (part.inlineData) images.push(`data:image/jpeg;base64,${part.inlineData.data}`);
    }
  }
  return images;
};

export const generateStoryOutline = async (idea: string, template: StoryTemplate, image?: string): Promise<{ title: string; pages: Partial<StoryPage>[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];
  if (image) {
    try {
      const imgBase64 = await prepareImageForAi(image);
      parts.push({ inlineData: { data: imgBase64, mimeType: "image/jpeg" } });
    } catch(e) {}
  }
  parts.push({ text: `Create a 12-page picture book outline for: "${idea}". Template: ${template}. JSON output: {title, pages: [{type, text}]}` });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: { responseMimeType: "application/json" }
  });
  const data = extractJson(response.text);
  return { 
    title: data.title || "奇妙故事", 
    pages: (data.pages || []).map((p: any, idx: number) => ({ ...p, id: generateId(), pageNumber: idx + 1 })) 
  };
};
