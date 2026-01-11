
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { StoryTemplate, StoryPage, VisualStyle } from "../types";

const generateId = () => Math.random().toString(36).substr(2, 9);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

/**
 * 健壮的 JSON 解析器，移除 Markdown 标记
 */
const robustJsonParse = (text: string) => {
  const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON Parse Error. Raw text:", text);
    throw new Error("AI 返回的数据格式不正确，请重试。");
  }
};

const getStylePrompt = (style: VisualStyle, customDesc?: string): string => {
  if (style === VisualStyle.CUSTOM && customDesc) return customDesc;
  switch (style) {
    case VisualStyle.WATERCOLOR: return "Soft watercolor illustration, wet-on-wet technique, delicate edges, paper texture, storybook style.";
    case VisualStyle.OIL_PAINTING: return "Classic oil painting, thick impasto brushstrokes, rich textures, cinematic lighting, artistic.";
    case VisualStyle.VINTAGE: return "1950s retro storybook style, muted nostalgic tones, grainy paper effect, hand-drawn.";
    case VisualStyle.FLAT_ART: return "Modern flat vector illustration, organic grain texture, clean lines, professional art.";
    case VisualStyle.GHIBLI: return "Studio Ghibli style, lush green environments, hand-painted anime look, cinematic.";
    case VisualStyle.PIXAR_3D: return "3D CGI animation style, subsurface scattering, vibrant lighting, soft shadows, Disney look.";
    case VisualStyle.CRAYON: return "Wax crayon drawing, naive child-like strokes, thick waxy texture, bright colors.";
    case VisualStyle.PAPER_CUT: return "Layered paper-cut art, distinct shadow depths, handcrafted paper texture, artistic collage.";
    default: return `Style: ${style}.`;
  }
};

/**
 * 核心逻辑：视觉与文本深度对齐引擎
 */
export const finalizeVisualScript = async (
  pages: Partial<StoryPage>[], 
  characterDesc: string, 
  characterSeedImage: string,
  style: VisualStyle,
  styleRefImage?: string
): Promise<{ pages: StoryPage[], analyzedCharacterDesc: string, analyzedStyleDesc?: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let analyzedStyleDesc = "";
  if (style === VisualStyle.CUSTOM && styleRefImage) {
    try {
      analyzedStyleDesc = await analyzeStyleImage(styleRefImage);
    } catch (e) {
      console.warn("Style analysis failed, using default.");
    }
  }
  
  const stylePrompt = getStylePrompt(style, analyzedStyleDesc);
  
  try {
    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: characterSeedImage.split(',')[1], mimeType: 'image/png' } },
          { text: `你是一名角色设计师。请仔细观察这张角色设计图，提取出其详尽的物理特征描述（包括服饰细节）。输出要求：一段简洁但精准的中文特征描述。` }
        ]
      }
    });
    const analyzedDesc = analysisResponse.text?.trim() || characterDesc;

    const scriptResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `你是一名绘本导演。
                 【角色最终设定描述】 "${analyzedDesc}"
                 【画风设定】 "${stylePrompt}"
                 【任务】 修正每一页的故事文字并生成视觉分镜提示词（英文），确保与上述设定完全统一。
                 【待对齐页列表】 ${pages.map((p, i) => `页${i+1}: ${p.text}`).join('\n')}
                 请返回 JSON。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            updatedPages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  visualPrompt: { type: Type.STRING }
                },
                required: ["text", "visualPrompt"]
              }
            },
          },
          required: ["updatedPages"],
        },
      },
    });

    const data = robustJsonParse(scriptResponse.text || '{}');
    const updatedData = data.updatedPages || [];
    
    const finalPages = pages.map((p, idx) => ({
      ...p,
      text: updatedData[idx]?.text || p.text,
      visualPrompt: updatedData[idx]?.visualPrompt || `${analyzedDesc}, ${stylePrompt}, action: ${p.text}`,
      isGenerating: false
    })) as StoryPage[];

    return { 
      pages: finalPages, 
      analyzedCharacterDesc: analyzedDesc, 
      analyzedStyleDesc: style === VisualStyle.CUSTOM ? analyzedStyleDesc : undefined 
    };
  } catch (error: any) {
    console.error("Pipeline failed:", error);
    throw new Error(error.message || "故事脚本生成失败");
  }
};

/**
 * 图像生成
 */
export const generateSceneImage = async (
  pageText: string, 
  visualPrompt: string, 
  analyzedCharacterDesc: string, 
  characterImageBase64: string, 
  style: VisualStyle,
  styleDesc?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const stylePrompt = getStylePrompt(style, styleDesc);
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: characterImageBase64.split(',')[1], mimeType: 'image/png' } },
          { text: `Illustration task for a children's picture book. 
                    Main character reference is attached. 
                    Character description: ${analyzedCharacterDesc}.
                    Scene requirement: ${visualPrompt}.
                    Artistic Style: ${stylePrompt}.
                    Focus on consistent character features and vibrant colors. No text in image.` }
        ]
      },
      config: { imageConfig: { aspectRatio: "1:1" }, safetySettings }
    });
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    // 如果没有生成图，检查原因
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY') {
      throw new Error("生图请求被安全过滤器拦截，请尝试修改描述词或更换参考图。");
    }
    
    throw new Error("模型未返回图像数据，请稍后重试。");
  } catch (error: any) {
    if (error.message?.includes("entity was not found")) {
      throw new Error("KEY_EXPIRED");
    }
    throw error;
  }
};

export const editPageImage = async (
  currentImageBase64: string, 
  characterImageBase64: string, 
  editInstruction: string, 
  analyzedCharacterDesc: string,
  style: VisualStyle,
  styleDesc?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const stylePrompt = getStylePrompt(style, styleDesc);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: characterImageBase64.split(',')[1], mimeType: 'image/png' } },
          { inlineData: { data: currentImageBase64.split(',')[1], mimeType: 'image/png' } },
          { text: `Edit the second image based on: "${editInstruction}". Maintain consistency with the character in the first image (${analyzedCharacterDesc}) and keep the art style (${stylePrompt}). No text.` }
        ]
      },
      config: { imageConfig: { aspectRatio: "1:1" }, safetySettings }
    });
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) { if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`; }
    }
    throw new Error("微调失败，模型未返回结果。");
  } catch (error: any) {
    if (error.message?.includes("entity was not found")) throw new Error("KEY_EXPIRED");
    throw error;
  }
};

export const generateStoryOutline = async (idea: string, template: StoryTemplate, imageBase64?: string): Promise<{ title: string; pages: Partial<StoryPage>[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];
  if (imageBase64) parts.push({ inlineData: { data: imageBase64.split(',')[1], mimeType: "image/png" } });
  parts.push({ text: `请基于创意 "${idea}" 创作绘本大纲（中文）。模板: ${template}。结构：1个封面，10页正文，1个封底。仅返回 JSON 格式数据。` });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        safetySettings,
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
                  type: { type: Type.STRING, enum: ["cover", "story", "back"] },
                  text: { type: Type.STRING },
                },
                required: ["type", "text"],
              },
            },
          },
          required: ["title", "pages"],
        },
      },
    });
    const data = robustJsonParse(response.text || '{}');
    return { title: data.title || "未命名故事", pages: (data.pages || []).map((p: any, idx: number) => ({ ...p, id: generateId(), pageNumber: idx + 1 })) };
  } catch (error: any) { 
    if (error.message?.includes("entity was not found")) throw new Error("KEY_EXPIRED");
    throw error; 
  }
};

const analyzeStyleImage = async (imageBase64: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/png' } },
          { text: `Analyze the artistic style of this image. Describe medium, brushwork, and lighting in 30 words.` }
        ]
      }
    });
    return response.text?.trim() || "Hand-painted artistic style";
  } catch (e) {
    return "Hand-painted artistic style";
  }
};

export const generateCharacterOptions = async (description: string, style: VisualStyle, referenceImageBase64?: string, styleDesc?: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const stylePrompt = getStylePrompt(style, styleDesc);
  let promptText = `Character design sheet for: ${description}. Style: ${stylePrompt}. Multiple poses, white background, no text. High quality.`;
  const parts: any[] = [];
  if (referenceImageBase64) parts.push({ inlineData: { data: referenceImageBase64.split(',')[1], mimeType: 'image/png' } });
  parts.push({ text: promptText });
  
  try {
    const response = await ai.models.generateContent({ 
      model: 'gemini-2.5-flash-image', 
      contents: { parts }, 
      config: { imageConfig: { aspectRatio: "1:1" }, safetySettings } 
    });
    const images: string[] = [];
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) { 
        if (part.inlineData) images.push(`data:image/png;base64,${part.inlineData.data}`); 
      }
    }
    if (images.length === 0) throw new Error("角色生成失败，请调整描述词。");
    return images;
  } catch (error: any) { 
    if (error.message?.includes("entity was not found")) throw new Error("KEY_EXPIRED");
    throw error; 
  }
};
