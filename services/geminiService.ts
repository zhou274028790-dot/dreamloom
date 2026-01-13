
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
 * 优化后的图片预处理，增加跨域容错逻辑
 */
const prepareImageForAi = async (imgData: string): Promise<string> => {
  if (!imgData) throw new Error("无效的图片数据");
  
  // 如果已经是 base64，直接返回内容部分
  if (imgData.startsWith('data:')) {
    return imgData.split(',')[1];
  }

  // 如果是 URL，尝试通过 Canvas 绕过可能的跨域限制
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgData;
    
    return await new Promise((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas context failed"));
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
      };
      img.onerror = () => reject(new Error("图片加载失败，请尝试重新上传"));
      // 5秒超时
      setTimeout(() => reject(new Error("读取参考图超时")), 5000);
    });
  } catch (e) {
    throw new Error("参考图处理异常，请确保图片已正确上传");
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
  
  const charBase64 = await prepareImageForAi(characterImg);
  
  // 注入高级构图指令：强制 2:1 视觉，非居中，动态流线
  const compositionPrompt = "Extremely wide 2:1 cinema composition. NO CENTRAL SUBJECT. Use dynamic leading lines and curves. High-end storybook illustration, no frames, no text.";
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', 
    contents: { 
      parts: [
        { inlineData: { data: charBase64, mimeType: 'image/jpeg' } },
        { text: `${compositionPrompt} Character traits: ${characterDesc}. Style: ${stylePrompt}. Scene action: ${visualPrompt}. Background context: ${pageText}.` }
      ]
    },
    config: { 
      safetySettings,
      imageConfig: {
        aspectRatio: "16:9" 
      }
    }
  });
  
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) throw new Error("AI 拒绝生成此画面（可能触发安全审核或网络波动）");
  
  for (const part of candidates[0].content.parts) {
    if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
  }
  throw new Error("生成结果中未包含有效图像数据");
};

export const analyzeStyleImage = async (imageUrl: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64 = await prepareImageForAi(imageUrl);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: base64, mimeType: 'image/jpeg' } },
        { text: "Describe the artistic style of this image in 5 descriptive words." }
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
        { text: "Describe this character's visual traits concisely." }
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
        { text: `Edit current scene: ${instruction}. Keep style: ${stylePrompt}. Subject: ${characterDesc}. Cinema 16:9 widescreen.` }
      ]
    },
    config: { imageConfig: { aspectRatio: "16:9" } }
  });
  
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) throw new Error("微调失败（模型未返回内容）");

  for (const part of candidates[0].content.parts) {
    if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
  }
  throw new Error("微调未生成图像");
};

export const generateCharacterOptions = async (description: string, style: VisualStyle, image?: string, styleDesc?: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const stylePrompt = getStylePrompt(style, styleDesc);
  const parts: any[] = [];
  if (image) {
    const imgBase64 = await prepareImageForAi(image);
    parts.push({ inlineData: { data: imgBase64, mimeType: 'image/jpeg' } });
  }
  parts.push({ text: `Full body character design sheet: ${description}. Clear background. Style: ${stylePrompt}.` });
  
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
  parts.push({ text: `Story outline for: "${idea}". Template: ${template}. EXACTLY 12 pages. JSON: {title, pages: [{type, text}]}` });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: { responseMimeType: "application/json" }
  });
  const data = extractJson(response.text);
  return { 
    title: data.title || "未命名绘本", 
    pages: (data.pages || []).map((p: any, idx: number) => ({ ...p, id: generateId(), pageNumber: idx + 1 })) 
  };
};
