
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
 * 极强鲁棒性的图片转换，专门解决 Firebase URL 跨域导致的生图失败
 */
const prepareImageForAi = async (imgData: string): Promise<string> => {
  if (!imgData) throw new Error("无效的图片数据");
  
  if (imgData.startsWith('data:')) {
    return imgData.split(',')[1];
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    // 关键：必须在设置 src 前设置 crossOrigin
    img.crossOrigin = "anonymous"; 
    // 增加时间戳防止缓存导致的 CORS 失败
    img.src = imgData.includes('?') ? `${imgData}&t=${Date.now()}` : `${imgData}?t=${Date.now()}`;
    
    const timeout = setTimeout(() => {
      img.src = "";
      reject(new Error("读取参考图超时，请检查网络环境或重新上传"));
    }, 10000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context failed");
        
        // 缩放图片防止 base64 过大导致 API 报错 (保持在 1024 左右)
        const MAX_SIZE = 1024;
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
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl.split(',')[1]);
      } catch (err) {
        reject(new Error("浏览器安全策略拦截了图片读取，建议刷新重试"));
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("图片资源加载失败，请检查网络或图片有效性"));
    };
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
  
  // 核心修复点：使用更强的图片转换
  const charBase64 = await prepareImageForAi(characterImg);
  
  const compositionPrompt = "Wide cinematic 2:1 composition. Storybook illustration style, high detail, vibrant colors. No text in image.";
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', 
    contents: { 
      parts: [
        { inlineData: { data: charBase64, mimeType: 'image/jpeg' } },
        { text: `${compositionPrompt} Subject Consistency: ${characterDesc}. Art Style: ${stylePrompt}. Current Scene: ${visualPrompt}. Plot: ${pageText}.` }
      ]
    },
    config: { 
      safetySettings,
      imageConfig: { aspectRatio: "16:9" }
    }
  });
  
  if (!response.candidates?.[0]?.content?.parts) throw new Error("AI 引擎未生成画面，请检查描述词或重试");
  
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
  }
  throw new Error("生成结果不含图像数据");
};

export const analyzeStyleImage = async (imageUrl: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64 = await prepareImageForAi(imageUrl);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: base64, mimeType: 'image/jpeg' } },
        { text: "Briefly describe the artistic style of this image in 5 keywords." }
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
  if (style === VisualStyle.CUSTOM && styleRefImage) {
    analyzedStyleDesc = await analyzeStyleImage(styleRefImage);
  }
  
  const stylePrompt = getStylePrompt(style, analyzedStyleDesc);
  
  const analysisResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: charBase64, mimeType: 'image/jpeg' } },
        { text: "Summarize this character's visual features for image generation consistency." }
      ]
    }
  });
  const analyzedDesc = analysisResponse.text?.trim() || characterDesc;

  const scriptResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Character: ${analyzedDesc}, Style: ${stylePrompt}. Book: ${pages.map(p => p.text).join('|')}. JSON: {updatedPages: [{text, visualPrompt}]}`,
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
        { text: `Modify the scene based on: ${instruction}. Keep character as: ${characterDesc}. Style: ${stylePrompt}.` }
      ]
    },
    config: { imageConfig: { aspectRatio: "16:9" } }
  });
  
  if (!response.candidates?.[0]?.content?.parts) throw new Error("微调失败");

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
  }
  throw new Error("微调未成功");
};

export const generateCharacterOptions = async (description: string, style: VisualStyle, image?: string, styleDesc?: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const stylePrompt = getStylePrompt(style, styleDesc);
  const parts: any[] = [];
  if (image) {
    const imgBase64 = await prepareImageForAi(image);
    parts.push({ inlineData: { data: imgBase64, mimeType: 'image/jpeg' } });
  }
  parts.push({ text: `Full body character design sheet for ${description}. White background. Style: ${stylePrompt}.` });
  
  const response = await ai.models.generateContent({ 
    model: 'gemini-2.5-flash-image', 
    contents: { parts }
  });
  const images: string[] = [];
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
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
  parts.push({ text: `Create a 12-page story outline for: "${idea}". Template: ${template}. JSON: {title, pages: [{type, text}]}` });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: { responseMimeType: "application/json" }
  });
  const data = extractJson(response.text);
  return { 
    title: data.title || "奇妙探险", 
    pages: (data.pages || []).map((p: any, idx: number) => ({ ...p, id: generateId(), pageNumber: idx + 1 })) 
  };
};
