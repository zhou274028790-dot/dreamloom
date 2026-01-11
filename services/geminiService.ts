
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { StoryTemplate, StoryPage, VisualStyle } from "../types";

const generateId = () => Math.random().toString(36).substr(2, 9);

// Fix: Added extractJson helper to parse and sanitize JSON from AI response text
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
 * 采用多重路径尝试加载图片，解决 CORS 和网络抖动问题
 */
const prepareImageForAi = async (imgData: string, retryCount = 0): Promise<string> => {
  if (!imgData) throw new Error("无效的图片数据");

  // 1. 如果已经是 Base64，直接截取返回
  if (imgData.startsWith('data:')) {
    return imgData.includes(',') ? imgData.split(',')[1] : imgData;
  }

  // 2. 尝试使用 fetch 获取（带缓存策略）
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

  // 3. 最终手段：通过 Invisible Image 对象加载
  try {
    return await processImageFromUrl(imgData);
  } catch (innerError) {
    if (retryCount < 2) {
      // 增加随机延迟后重试
      await new Promise(r => setTimeout(r, 1000));
      return prepareImageForAi(imgData, retryCount + 1);
    }
    throw new Error("图片加载失败，请检查网络或更换参考图。");
  }
};

const processImageFromUrl = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`; // 强行刷新缓存
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 1024; // 升级为 1K 分辨率处理
      let width = img.width;
      let height = img.height;
      if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
      else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error("Canvas failure"));
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      try {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
      } catch (e) {
        reject(new Error("Canvas Tainted - CORS Policy violation"));
      }
    };
    img.onerror = () => reject(new Error("Image Load Event Error"));
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
    case VisualStyle.WATERCOLOR: return "Soft watercolor illustration, wet-on-wet technique, beautiful bleeding effects, heavy cold-press watercolor paper texture.";
    case VisualStyle.OIL_PAINTING: return "Expressionist oil painting, visible thick impasto brushstrokes, coarse canvas grain texture, rich oil pigments.";
    case VisualStyle.VINTAGE: return "Retro mid-century storybook illustration, halftone dot texture, aged paper grain, warm nostalgic color palette.";
    case VisualStyle.FLAT_ART: return "Artistic flat vector illustration, organic paper grain noise, subtle textures, soft minimalist characters.";
    case VisualStyle.GHIBLI: return "Studio Ghibli style, lush hand-painted background, cinematic lighting, nostalgic anime aesthetic.";
    case VisualStyle.PIXAR_3D: return "3D CGI character design, Disney Pixar style, soft subsurface scattering, high quality digital art.";
    case VisualStyle.CRAYON: return "Child-like crayon drawing, waxy texture, heavy paper tooth grain, bright playful coloring.";
    case VisualStyle.PAPER_CUT: return "Layered paper-cut collage art, recycled fiber paper texture, distinct drop shadows for depth.";
    default: return style;
  }
};

/**
 * 绘本页面生成：升级为 gemini-3-pro-image-preview
 */
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
  
  // 容错处理：如果角色图加载失败，尝试只用文字生成
  let parts: any[] = [];
  try {
    const charBase64 = await prepareImageForAi(characterImg);
    parts.push({ inlineData: { data: charBase64, mimeType: 'image/jpeg' } });
  } catch (e) {
    console.error("Warning: Character image loading failed, proceeding with text-only.", e);
  }

  parts.push({ text: `consistent children's book illustration. Character description: ${characterDesc}. Style: ${stylePrompt}. Scene action: ${visualPrompt}. Narrative context: ${pageText}. High quality 2K masterpiece, vivid colors, no text labels, no watermark.` });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', // 升级到专业绘本级模型
      contents: { parts },
      config: { 
        safetySettings,
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K" // 默认 1K，如果配额足够会自动提升画质
        }
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
    }
    throw new Error("AI did not return image data");
  } catch (error) {
    throw new Error("生成引擎繁忙 (Error: " + error.message + ")");
  }
};

// Fix: Added analyzeStyleImage function to identify visual characteristics of a reference image
export const analyzeStyleImage = async (imageUrl: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64 = await prepareImageForAi(imageUrl);
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64, mimeType: 'image/jpeg' } },
          { text: "Describe the artistic style of this image in detail for a professional illustrator prompt. Keep it concise." }
        ]
      }
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Style analysis failed", error);
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
          { text: "Detailed visual description of this character for a professional illustrator. Summarize in one short Chinese sentence." }
        ]
      }
    });
    const analyzedDesc = analysisResponse.text?.trim() || characterDesc;

    const scriptResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Character: ${analyzedDesc}, Style: ${stylePrompt}. Task: Create vivid, storyboard-style visual prompts for each scene of a 1:1 square picture book. Scenes: ${pages.map(p => p.text).join('|')}. Return JSON ONLY: {updatedPages: [{text, visualPrompt}]}`,
      config: { responseMimeType: "application/json" }
    });

    const data = extractJson(scriptResponse.text);
    if (!data || !data.updatedPages) throw new Error("JSON Extract failed");

    const finalPages = pages.map((p, idx) => ({
      ...p,
      text: data.updatedPages?.[idx]?.text || p.text,
      visualPrompt: data.updatedPages?.[idx]?.visualPrompt || `${analyzedDesc}, ${stylePrompt}`,
      isGenerating: false
    })) as StoryPage[];

    return { pages: finalPages, analyzedCharacterDesc: analyzedDesc, analyzedStyleDesc };
  } catch (error) {
    throw new Error("剧本解析失败: " + error.message);
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
          { text: `Modify the first image based on: ${instruction}. Ensure character matches second image: ${characterDesc}. Style: ${stylePrompt}. High quality 2K output.` }
        ]
      },
      config: { 
        safetySettings,
        imageConfig: { aspectRatio: "1:1" }
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
    }
    throw new Error("Edit engine error");
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
  parts.push({ text: `Character design sheet: ${description}. Multiple poses, front/side/back views. Consistent character, soft art style. Background: simple solid light color. Style: ${stylePrompt}.` });
  
  try {
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-pro-image-preview', 
      contents: { parts }, 
      config: { safetySettings, imageConfig: { aspectRatio: "1:1" } } 
    });
    const images: string[] = [];
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) images.push(`data:image/jpeg;base64,${part.inlineData.data}`);
    }
    return images;
  } catch (error) {
    throw new Error("形象引擎响应异常: " + error.message);
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
  parts.push({ text: `Create a captivating 12-page children's picture book script based on: "${idea}". Template: ${template}. Language: Chinese. Target Audience: Kids 3-8. Return JSON ONLY: {title, pages: [{type, text}]}` });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: { responseMimeType: "application/json" }
    });
    
    const data = extractJson(response.text);
    if (!data || !data.pages) throw new Error("JSON parse error");

    return { 
      title: data.title, 
      pages: (data.pages || []).map((p: any, idx: number) => ({ 
        ...p, 
        id: generateId(), 
        pageNumber: idx + 1 
      })) 
    };
  } catch (err) {
    throw new Error("故事大纲引擎繁忙，请稍后再试。");
  }
};
