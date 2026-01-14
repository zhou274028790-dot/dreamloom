
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
 * 终极鲁棒性的图片转换：解决 CORS、缓存、及大图 API 限制
 */
const prepareImageForAi = async (imgData: string): Promise<string> => {
  if (!imgData) throw new Error("无效的图片数据");
  
  if (imgData.startsWith('data:')) {
    return imgData.split(',')[1];
  }

  // 尝试通过 HTMLImageElement 配合 Canvas 转换，这种方式处理 CORS 最为通用
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; 
    
    // 添加时间戳绕过部分 CDN 的 CORS 缓存错误
    const cacheBuster = imgData.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
    img.src = imgData + cacheBuster;
    
    const timeout = setTimeout(() => {
      img.src = "";
      reject(new Error("读取参考图超时，请检查网络"));
    }, 15000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context failed");
        
        // 限制最大尺寸为 1024 提高传输效率
        const MAX_SIZE = 1024;
        let w = img.width, h = img.height;
        if (w > MAX_SIZE || h > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
          w *= ratio; h *= ratio;
        }

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        
        // 使用高质量压缩
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        resolve(base64.split(',')[1]);
      } catch (err) {
        console.error("Canvas draw error:", err);
        reject(new Error("图片资源加载受限，请尝试刷新页面或更换图片"));
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("图片资源加载失败，请检查网络链接或图片权限"));
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

/**
 * Fix: Added missing export generateStoryOutline
 * Generates a story outline based on an idea and template
 */
export const generateStoryOutline = async (idea: string, template: StoryTemplate, image?: string): Promise<{ title: string, pages: Partial<StoryPage>[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];
  
  if (image) {
    const base64 = await prepareImageForAi(image);
    parts.push({ inlineData: { data: base64, mimeType: 'image/jpeg' } });
  }

  parts.push({ text: `Create a children's book story outline. 
    Idea: "${idea}" 
    Template: "${template}"
    Return a JSON object:
    {
      "title": "A short engaging title",
      "pages": [
        {
          "text": "The narrative text for this page (concise, age-appropriate)",
          "visualPrompt": "Detailed prompt for an illustrator, describing the scene and characters"
        }
      ]
    }
    Provide exactly 6 pages.` 
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          pages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                visualPrompt: { type: Type.STRING }
              },
              required: ["text", "visualPrompt"]
            }
          }
        },
        required: ["title", "pages"]
      }
    }
  });

  const data = JSON.parse(response.text || '{}');
  return {
    title: data.title || "My Story",
    pages: (data.pages || []).map((p: any, i: number) => ({
      id: generateId(),
      type: 'story' as const,
      pageNumber: i + 1,
      text: p.text,
      visualPrompt: p.visualPrompt,
      isGenerating: false
    }))
  };
};

/**
 * Fix: Added missing export generateCharacterOptions
 * Generates character options for visual consistency
 */
export const generateCharacterOptions = async (desc: string, style: VisualStyle, roleRefImg?: string, styleRefImg?: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const stylePrompt = getStylePrompt(style, styleRefImg);
  const parts: any[] = [];
  
  if (roleRefImg) {
    const base64 = await prepareImageForAi(roleRefImg);
    parts.push({ inlineData: { data: base64, mimeType: 'image/jpeg' } });
  }
  
  parts.push({ text: `Character Design Sheet. Subject: ${desc}. Style: ${stylePrompt}. White background, professional character concept art, high detail.` });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: { imageConfig: { aspectRatio: "1:1" } }
  });

  const images: string[] = [];
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        images.push(`data:image/jpeg;base64,${part.inlineData.data}`);
      }
    }
  }
  
  if (images.length === 0) throw new Error("Character generation failed");
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
  
  // 核心：处理参考图
  const charBase64 = await prepareImageForAi(characterImg);
  
  const compositionPrompt = "Extremely wide cinematic 2:1 composition. Storybook illustration, vibrant lighting, professional concept art. No text or user interface elements in image.";
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', 
    contents: { 
      parts: [
        { inlineData: { data: charBase64, mimeType: 'image/jpeg' } },
        { text: `${compositionPrompt} Subject: ${characterDesc}. Style: ${stylePrompt}. Scene Action: ${visualPrompt}. Background Context: ${pageText}.` }
      ]
    },
    config: { 
      safetySettings,
      imageConfig: { aspectRatio: "16:9" }
    }
  });
  
  if (!response.candidates?.[0]?.content?.parts) throw new Error("AI 拒绝生成或网络波动，请检查描述词");
  
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
  }
  throw new Error("生成结果为空，请稍后重试");
};

/**
 * Fix: Added missing export editPageImage
 * Edits a page image based on a specific instruction
 */
export const editPageImage = async (
  pageImg: string, 
  charImg: string, 
  instruction: string, 
  charDesc: string,
  style: VisualStyle,
  styleDesc?: string
): Promise<string> => {
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
        { text: `Modify this scene. Instruction: ${instruction}. Keep the character (ref provided) consistent. Subject: ${charDesc}. Style: ${stylePrompt}.` }
      ]
    }
  });

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/jpeg;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Edit failed");
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
        { text: "Analyze this character and provide a concise visual description for consistency." }
      ]
    }
  });
  const analyzedDesc = analysisResponse.text?.trim() || characterDesc;

  const scriptResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Character: ${analyzedDesc}, Style: ${stylePrompt}. Story Content: ${pages.map(p => p.text).join('|')}. JSON Output: {updatedPages: [{text, visualPrompt}]}`,
    config: { responseMimeType: "application/json" }
  });

  const data = extractJson(scriptResponse.text);
  const finalPages = pages.map((p, idx) => ({
    ...p,
    text: data?.updatedPages?.[idx]?.text || p.text,
    visualPrompt: data?.updatedPages?.[idx]?.visualPrompt || `${analyzedDesc}, ${stylePrompt}`,
    isGenerating: false
  })) as StoryPage[];

  /**
   * Fix: Renamed finalPages to pages in the return object to match the return type definition.
   */
  return { pages: finalPages, analyzedCharacterDesc: analyzedDesc, analyzedStyleDesc };
};
