
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
 * 核心修复：降低尺寸上限 (768px) 并提高压缩率，解决 Token 超限 (32768) 报错
 */
const prepareImageForAi = async (imgData: string): Promise<string> => {
  if (!imgData) throw new Error("无效的图片数据");
  
  if (imgData.startsWith('data:')) {
    // 即使是 dataURL，也重新绘制一遍进行缩放
    const img = new Image();
    img.src = imgData;
    await new Promise((r) => (img.onload = r));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const MAX_SIZE = 768; // 降低尺寸，节省 Token
    let w = img.width;
    let h = img.height;
    if (w > MAX_SIZE || h > MAX_SIZE) {
      const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
      w *= ratio; h *= ratio;
    }
    canvas.width = w;
    canvas.height = h;
    ctx?.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; 
    const separator = imgData.includes('?') ? '&' : '?';
    img.src = `${imgData}${separator}t=${Date.now()}`;
    
    const timeout = setTimeout(() => {
      img.src = "";
      reject(new Error("读取图片资源超时，请检查网络或刷新重试"));
    }, 15000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context failed");
        
        const MAX_SIZE = 768; 
        let w = img.width;
        let h = img.height;
        if (w > MAX_SIZE || h > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
          w *= ratio; h *= ratio;
        }

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(base64.split(',')[1]);
      } catch (err) {
        console.error("Canvas conversion error:", err);
        reject(new Error("浏览器安全策略拦截了图片访问，请尝试刷新页面或更换网络"));
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("图片资源加载失败，请检查该图片是否已被移动或删除"));
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

export const generateStoryOutline = async (idea: string, template: StoryTemplate, image?: string): Promise<{ title: string, pages: Partial<StoryPage>[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];
  if (image) {
    const base64 = await prepareImageForAi(image);
    parts.push({ inlineData: { data: base64, mimeType: 'image/jpeg' } });
  }
  // 要求生成 8 页基础结构
  parts.push({ text: `Create an 8-page children's story outline. Idea: "${idea}", Template: "${template}". JSON: {title, pages: [{text, visualPrompt}]}` });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: { responseMimeType: "application/json" }
  });

  const data = extractJson(response.text);
  return {
    title: data?.title || "My Story",
    pages: (data?.pages || []).map((p: any, i: number) => ({
      id: generateId(),
      type: 'story',
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
