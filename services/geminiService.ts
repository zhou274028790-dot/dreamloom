
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
 * 核心升级：图片加载引擎 (The Loom Engine)
 * 锁定 1024*1024 处理规格，解决跨域失败问题
 */
const prepareImageForAi = async (imgData: string, retryCount = 0): Promise<string> => {
  if (!imgData) throw new Error("无效的图片数据");

  if (imgData.startsWith('data:')) {
    return imgData.includes(',') ? imgData.split(',')[1] : imgData;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(imgData, { 
      mode: 'cors', 
      cache: 'no-cache',
      signal: controller.signal 
    });
    clearTimeout(timeout);
    
    if (resp.ok) {
      const blob = await resp.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    console.warn(`Fetch image failed, trying fallback mode (Retry: ${retryCount})...`);
  }

  try {
    return await processImageFromUrl(imgData);
  } catch (innerError) {
    if (retryCount < 1) {
      await new Promise(r => setTimeout(r, 500));
      return prepareImageForAi(imgData, retryCount + 1);
    }
    // 如果最终都失败了，抛出更友好的错误
    throw new Error("AI 无法读取参考图，建议直接输入文字描述。");
  }
};

const processImageFromUrl = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    // 增加随机参数绕过可能的 CDN 缓存错误
    img.src = url.startsWith('http') ? `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}` : url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const SIZE = 1024; // 锁定 1K
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error("Canvas failure"));
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, SIZE, SIZE);
      try {
        // 强制以 Cover 模式绘制到 1024*1024
        const scale = Math.max(SIZE / img.width, SIZE / img.height);
        const x = (SIZE / 2) - (img.width / 2) * scale;
        const y = (SIZE / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
      } catch (e) {
        reject(new Error("CORS Tainted Canvas"));
      }
    };
    img.onerror = () => reject(new Error("Image element load error"));
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
    case VisualStyle.WATERCOLOR: return "Soft watercolor illustration, wet-on-wet technique, beautiful bleeding effects, cold-press paper texture.";
    case VisualStyle.OIL_PAINTING: return "Classic oil painting, thick impasto brushstrokes, rich textures, fine art quality.";
    case VisualStyle.VINTAGE: return "1950s retro children's book illustration, halftone texture, warm nostalgic palette.";
    case VisualStyle.FLAT_ART: return "Modern artistic flat illustration, subtle paper grain, minimalist shapes.";
    case VisualStyle.GHIBLI: return "Studio Ghibli anime style, hand-painted backgrounds, soft cinematic lighting.";
    case VisualStyle.PIXAR_3D: return "3D Disney Pixar style character, soft studio lighting, high-end CGI.";
    case VisualStyle.CRAYON: return "Hand-drawn crayon art, waxy texture, vibrant playful colors, paper tooth grain.";
    case VisualStyle.PAPER_CUT: return "Artistic paper-cut collage, layered depth, subtle drop shadows, recycled paper texture.";
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
  
  let parts: any[] = [];
  try {
    const charBase64 = await prepareImageForAi(characterImg);
    parts.push({ inlineData: { data: charBase64, mimeType: 'image/jpeg' } });
  } catch (e) {
    console.warn("Character image load failed, falling back to text only");
  }

  parts.push({ text: `professional children's book illustration. 1024x1024. Character: ${characterDesc}. Style: ${stylePrompt}. Action: ${visualPrompt}. Narrative: ${pageText}. No text, no frames, masterpiece quality.` });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', 
      contents: { parts },
      config: { 
        safetySettings,
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K" // 锁定 1K 分辨率 (1024x1024)
        }
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
    }
    throw new Error("AI returned no image");
  } catch (error) {
    throw new Error("引擎繁忙 ( " + error.message + " )");
  }
};

export const analyzeStyleImage = async (imageUrl: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64 = await prepareImageForAi(imageUrl);
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64, mimeType: 'image/jpeg' } },
          { text: "Describe the artistic style of this image for an illustrator. Concise, focusing on medium, line, and color." }
        ]
      }
    });
    return response.text?.trim() || "";
  } catch (error) {
    return "";
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
          { text: "Identify key visual traits of this character. One short Chinese sentence." }
        ]
      }
    });
    const analyzedDesc = analysisResponse.text?.trim() || characterDesc;

    const scriptResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Character: ${analyzedDesc}, Style: ${stylePrompt}. Scenes: ${pages.map(p => p.text).join('|')}. Return JSON ONLY: {updatedPages: [{text, visualPrompt}]}`,
      config: { responseMimeType: "application/json" }
    });

    const data = extractJson(scriptResponse.text);
    if (!data) throw new Error("JSON Error");

    const finalPages = pages.map((p, idx) => ({
      ...p,
      text: data.updatedPages?.[idx]?.text || p.text,
      visualPrompt: data.updatedPages?.[idx]?.visualPrompt || `${analyzedDesc}, ${stylePrompt}`,
      isGenerating: false
    })) as StoryPage[];

    return { pages: finalPages, analyzedCharacterDesc: analyzedDesc, analyzedStyleDesc };
  } catch (error) {
    throw new Error("Script error: " + error.message);
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
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { data: pageBase64, mimeType: 'image/jpeg' } },
          { inlineData: { data: charBase64, mimeType: 'image/jpeg' } },
          { text: `Edit first image: ${instruction}. Consistency with second image: ${characterDesc}. Style: ${stylePrompt}. 1024x1024.` }
        ]
      },
      config: { 
        safetySettings,
        imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
    }
    throw new Error("Edit failed");
  } catch (error) {
    throw new Error(error.message);
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
  parts.push({ text: `Professional character design sheet: ${description}. Multiple poses. Solid light background. Style: ${stylePrompt}. 1024x1024.` });
  
  try {
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-pro-image-preview', 
      contents: { parts }, 
      config: { safetySettings, imageConfig: { aspectRatio: "1:1", imageSize: "1K" } } 
    });
    const images: string[] = [];
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) images.push(`data:image/jpeg;base64,${part.inlineData.data}`);
    }
    return images;
  } catch (error) {
    throw new Error(error.message);
  }
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
  parts.push({ text: `Children's story script. Topic: "${idea}". Template: ${template}. Language: Chinese. 12 pages. Return JSON: {title, pages: [{type, text}]}` });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: { responseMimeType: "application/json" }
    });
    
    const data = extractJson(response.text);
    if (!data) throw new Error("JSON Parse Error");

    return { 
      title: data.title, 
      pages: (data.pages || []).map((p: any, idx: number) => ({ 
        ...p, 
        id: generateId(), 
        pageNumber: idx + 1 
      })) 
    };
  } catch (err) {
    throw new Error("AI 故事引擎响应异常");
  }
};
