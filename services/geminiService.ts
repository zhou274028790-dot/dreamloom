
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
 * 核心修复：极致图片压缩策略
 * 1. 强制长边 512px
 * 2. 质量 0.5
 * 3. 递归压缩：若 Base64 长度超过 200,000 字符，则继续按 0.8 倍缩小直到达标
 */
const prepareImageForAi = async (imgData: string): Promise<string> => {
  if (!imgData) throw new Error("无效的图片数据");

  const process = async (source: string | HTMLImageElement, currentMax: number): Promise<string> => {
    const img = typeof source === 'string' ? new Image() : source;
    if (typeof source === 'string') {
      img.src = source;
      await new Promise((r) => (img.onload = r));
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let w = img.width;
    let h = img.height;
    
    if (w > currentMax || h > currentMax) {
      const ratio = Math.min(currentMax / w, currentMax / h);
      w *= ratio; h *= ratio;
    }

    canvas.width = w;
    canvas.height = h;
    ctx?.drawImage(img, 0, 0, w, h);
    
    let quality = 0.5; // 用户要求的 0.5 质量
    let result = canvas.toDataURL('image/jpeg', quality);
    let base64 = result.split(',')[1];

    // 如果依然超过 200,000 字符限制，递归进一步缩小
    if (base64.length > 200000 && currentMax > 128) {
      return process(img, Math.floor(currentMax * 0.8));
    }
    
    return base64;
  };

  return process(imgData, 512); // 从 512px 开始
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

export const generateStoryOutline = async (idea: string, template: StoryTemplate, image?: string): Promise<{ title: string, pages: Partial<StoryPage>[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];
  if (image) {
    const base64 = await prepareImageForAi(image);
    parts.push({ inlineData: { data: base64, mimeType: 'image/jpeg' } });
  }
  // 要求生成 8 页基础结构
  parts.push({ text: `Create an 8-page children's story outline. 1 Cover, 6 internal story scenes, 1 Closing scene. Total 8 pages. Idea: "${idea}", Template: "${template}". JSON: {title, pages: [{text, visualPrompt}]}` });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: { responseMimeType: "application/json" }
  });

  const data = extractJson(response.text);
  return {
    title: data?.title || "My Story",
    pages: (data?.pages || []).slice(0, 8).map((p: any, i: number) => ({
      id: generateId(),
      type: i === 0 ? 'cover' : i === 7 ? 'back' : 'story',
      pageNumber: i + 1,
      text: p.text,
      visualPrompt: p.visualPrompt,
      isGenerating: false
    }))
  };
};

export const generateCharacterOptions = async (desc: string, style: VisualStyle, roleRefImg?: string, styleRefImg?: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const stylePrompt = getStylePrompt(style, styleRefImg);
  const parts: any[] = [];
  if (roleRefImg) {
    const base64 = await prepareImageForAi(roleRefImg);
    parts.push({ inlineData: { data: base64, mimeType: 'image/jpeg' } });
  }
  if (style === VisualStyle.CUSTOM && styleRefImg) {
    const sBase64 = await prepareImageForAi(styleRefImg);
    parts.push({ inlineData: { data: sBase64, mimeType: 'image/jpeg' } });
  }
  parts.push({ text: `Character Design Sheet for ${desc}. Style: ${stylePrompt}. White background.` });

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
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', 
    contents: { 
      parts: [
        { inlineData: { data: charBase64, mimeType: 'image/jpeg' } },
        { text: `16:9 illustration. Consistent Character: ${characterDesc}. Style: ${stylePrompt}. Scene: ${visualPrompt}. Context: ${pageText}. No text.` }
      ]
    },
    config: { safetySettings, imageConfig: { aspectRatio: "16:9" } }
  });
  
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
  }
  throw new Error("AI 无法生成图像，请尝试简化描述");
};

export const editPageImage = async (pageImg: string, charImg: string, instruction: string, charDesc: string, style: VisualStyle, styleDesc?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const stylePrompt = getStylePrompt(style, styleDesc);
  const pageBase64 = await prepareImageForAi(pageImg);
  const charBase64 = await prepareImageForAi(charImg);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: pageBase64, mimeType: 'image/jpeg' } },
        { inlineData: { data: charBase64, mimeType: 'image/jpeg' } },
        { text: `Edit scene: ${instruction}. Keep character ${charDesc} and style ${stylePrompt} consistent.` }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
  }
  throw new Error("微调失败");
};

export const analyzeStyleImage = async (imageUrl: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64 = await prepareImageForAi(imageUrl);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: base64, mimeType: 'image/jpeg' } },
        { text: "Describe style in 5 keywords." }
      ]
    }
  });
  return response.text?.trim() || "";
};

export const finalizeVisualScript = async (pages: Partial<StoryPage>[], charDesc: string, charImg: string, style: VisualStyle, styleRef?: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const charBase64 = await prepareImageForAi(charImg);
  let analyzedStyleDesc = styleRef ? await analyzeStyleImage(styleRef) : "";
  const stylePrompt = getStylePrompt(style, analyzedStyleDesc);

  const analysis = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { data: charBase64, mimeType: 'image/jpeg' } }, { text: "Analyze character features." }] }
  });
  const analyzedDesc = analysis.text?.trim() || charDesc;

  const script = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Character: ${analyzedDesc}, Style: ${stylePrompt}. Story: ${pages.map(p => p.text).join('|')}. JSON: {updatedPages: [{text, visualPrompt}]}`,
    config: { responseMimeType: "application/json" }
  });

  const data = extractJson(script.text);
  const finalPages = pages.map((p, idx) => ({
    ...p,
    text: data?.updatedPages?.[idx]?.text || p.text,
    visualPrompt: data?.updatedPages?.[idx]?.visualPrompt || `${analyzedDesc}, ${stylePrompt}`,
    isGenerating: false
  })) as StoryPage[];

  return { pages: finalPages, analyzedCharacterDesc: analyzedDesc, analyzedStyleDesc };
};
