
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { StoryTemplate, StoryPage, VisualStyle } from "../types";

const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * 强化版图片预处理：增加静默重试和更好的跨域处理
 */
const prepareImageForAi = async (imgData: string, retryCount = 0): Promise<string> => {
  if (!imgData) throw new Error("无效的图片数据");

  try {
    let blob: Blob;
    if (imgData.startsWith('http')) {
      const resp = await fetch(imgData, { mode: 'cors', cache: 'no-cache' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      blob = await resp.blob();
    } else {
      const resp = await fetch(imgData);
      blob = await resp.blob();
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 768; 
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas context failed"));
        
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedData = canvas.toDataURL('image/jpeg', 0.6);
        URL.revokeObjectURL(url);
        resolve(compressedData.split(',')[1]);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Image decoding failed"));
      };
      img.src = url;
    });
  } catch (e) {
    if (retryCount < 2) return prepareImageForAi(imgData, retryCount + 1);
    throw new Error("图片加载失败，请确保链接有效并允许跨域。");
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
          { text: "Analyze this art style thoroughly. Extract: 1. Primary and secondary color palette; 2. Composition style; 3. Artistic features like brushstrokes, textures, grain, or line work. Summarize into a single paragraph in English to be used as an AI style prompt for children's books." }
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
          { text: "简要描述此角色的外貌特征（中文，20字内）。" }
        ]
      }
    });
    const analyzedDesc = analysisResponse.text?.trim() || characterDesc;

    const scriptResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `角色: ${analyzedDesc}, 画风: ${stylePrompt}. 编写以下情节的英文生图提示词: ${pages.map(p => p.text).join('|')}. 仅返回 JSON: {updatedPages: [{text, visualPrompt}]}`,
      config: { responseMimeType: "application/json" }
    });

    const cleanJson = scriptResponse.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);
    const finalPages = pages.map((p, idx) => ({
      ...p,
      text: data.updatedPages?.[idx]?.text || p.text,
      visualPrompt: data.updatedPages?.[idx]?.visualPrompt || `${analyzedDesc}, ${stylePrompt}`,
      isGenerating: false
    })) as StoryPage[];

    return { pages: finalPages, analyzedCharacterDesc: analyzedDesc, analyzedStyleDesc };
  } catch (error) {
    console.error(error);
    throw new Error("脚本优化失败，请重试。");
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
          { text: `consistent children's book illustration. Character: ${characterDesc}. Style: ${stylePrompt}. Scene: ${visualPrompt}. High quality, 2D art, artistic composition, no text.` }
        ]
      },
      config: { safetySettings }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
    }
    throw new Error("模型未返回图像数据");
  } catch (error) {
    console.error(error);
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
          { text: `consistent book illustration edit. Change the first image based on: ${instruction}. Keep character from second image: ${characterDesc}. Style: ${stylePrompt}.` }
        ]
      },
      config: { safetySettings }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
    }
    throw new Error("编辑失败");
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
  parts.push({ text: `Character design sheet. Description: ${description}. Gentle abstract artistic character shapes. Art Style: ${stylePrompt}. Multiple poses, white background.` });
  
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
  parts.push({ text: `基于想法 "${idea}" 创作12页绘本情节大纲。模板: ${template}. 返回 JSON: {title, pages: [{type, text}]}` });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: { responseMimeType: "application/json" }
    });
    const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);
    return { title: data.title, pages: (data.pages || []).map((p: any, idx: number) => ({ ...p, id: generateId(), pageNumber: idx + 1 })) };
  } catch (err) {
    throw new Error("大纲生成失败");
  }
};
