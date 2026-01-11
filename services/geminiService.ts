
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { StoryTemplate, StoryPage, VisualStyle } from "../types";

const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * 强化版图片预处理：
 * 1. 优先使用 fetch 获取 Blob 解决跨域(CORS)问题。
 * 2. 严格限制输出尺寸和质量，平衡画质与 API 载荷。
 */
const prepareImageForAi = async (imgData: string): Promise<string> => {
  if (!imgData) throw new Error("无效的图片数据");

  // 如果是远程 URL，先转换成 Blob 规避 img.src 的跨域限制
  let blob: Blob;
  if (imgData.startsWith('http')) {
    try {
      const resp = await fetch(imgData, { mode: 'cors' });
      if (!resp.ok) throw new Error("无法从存储服务器读取图片");
      blob = await resp.blob();
    } catch (e) {
      console.error("Fetch image error:", e);
      throw new Error("网络受限，图片加载失败，请检查网络或重试。");
    }
  } else {
    // 已经是 base64
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
      if (!ctx) return reject(new Error("浏览器不支持 Canvas"));
      
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      const compressedData = canvas.toDataURL('image/jpeg', 0.6);
      URL.revokeObjectURL(url);
      resolve(compressedData.split(',')[1]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片解析失败，请尝试重新上传。"));
    };
    img.src = url;
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
  const msg = error.message || String(error);
  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
    throw new Error("频率过快，请稍等30秒再点击。更换付费 Key 可永久取消此限制。");
  }
  throw new Error(`生成失败: ${msg}`);
};

const getStylePrompt = (style: VisualStyle, customDesc?: string): string => {
  if (style === VisualStyle.CUSTOM && customDesc) return customDesc;
  switch (style) {
    case VisualStyle.WATERCOLOR: 
      return "Soft watercolor illustration on textured cold-press paper, wet-on-wet bleeding effects, delicate edges, artistic and gentle character designs.";
    case VisualStyle.OIL_PAINTING: 
      return "Classic oil painting, visible thick impasto brushstrokes, canvas texture, dramatic chiaroscuro lighting, rich artistic atmosphere.";
    case VisualStyle.VINTAGE: 
      return "Retro 1950s storybook style, muted nostalgic tones, halftone print textures, warm and comforting aesthetic.";
    case VisualStyle.FLAT_ART: 
      return "Modern flat vector art with organic paper textures and fine grain noise, abstract and gentle character shapes, minimalist but textured.";
    case VisualStyle.GHIBLI: 
      return "Studio Ghibli style anime illustration, lush painted environments, cinematic lighting, nostalgic atmosphere, highly detailed.";
    case VisualStyle.PIXAR_3D: 
      return "3D CGI animation style, Disney/Pixar look, vibrant colors, soft subsurface scattering, cute and friendly characters.";
    case VisualStyle.CRAYON: 
      return "Child-like crayon drawings with heavy waxy texture and rough paper grain, non-literal and abstract character forms, bright and playful.";
    case VisualStyle.PAPER_CUT: 
      return "Layered paper-cut collage art, distinct depth shadows, unique recycled paper textures, abstract and geometric character silhouettes.";
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
          { text: "深度分析此画风：1.主次色调与色彩搭配；2.构图规律；3.绘画特色（如笔触、肌理、线条感）。用英文总结成一段用于生图的 Style Description。" }
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
          { text: "分析此角色的关键特征并转化成适合绘本的中文描述（20字内）。" }
        ]
      }
    });
    const analyzedDesc = analysisResponse.text?.trim() || characterDesc;

    const scriptResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `角色特征: ${analyzedDesc}, 画风要求: ${stylePrompt}. 基于以下情节编写详细分镜提示词: ${pages.map(p => p.text).join('|')}. 仅返回 JSON: {updatedPages: [{text, visualPrompt}]}`,
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
          { text: `consistent children's book illustration. Character: ${characterDesc}. Style: ${stylePrompt}. Scene: ${visualPrompt}. High quality, no text.` }
        ]
      },
      config: { safetySettings }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
    }
    throw new Error("AI未能返回有效的图像数据");
  } catch (error) {
    return handleAiError(error);
  }
};

// Fix: Added missing export for editPageImage to handle scene modification
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
          { text: `consistent children's book illustration modification. Based on this instruction: ${instruction}. Character: ${characterDesc}. Style: ${stylePrompt}. High quality, no text.` }
        ]
      },
      config: { safetySettings }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
    }
    throw new Error("AI未能返回有效的图像数据");
  } catch (error) {
    return handleAiError(error);
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
  parts.push({ text: `Character concept sheet. Description: ${description}. Multiple poses, abstract and gentle design. Art Style: ${stylePrompt}. White background.` });
  
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
  parts.push({ text: `基于想法 "${idea}" 创作12页绘本大纲。模板: ${template}. 返回 JSON: {title, pages: [{type, text}]}` });
  
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
    return handleAiError(err);
  }
};
