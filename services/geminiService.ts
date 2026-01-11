
import { GoogleGenAI, Type } from "@google/genai";
import { StoryTemplate, StoryPage, VisualStyle } from "../types";

const generateId = () => Math.random().toString(36).substr(2, 9);

const safetySettings = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

const getStylePrompt = (style: VisualStyle, customDesc?: string): string => {
  if (style === VisualStyle.CUSTOM && customDesc) return customDesc;
  switch (style) {
    case VisualStyle.WATERCOLOR: return "Soft watercolor illustration, wet-on-wet technique, delicate edges, paper texture.";
    case VisualStyle.OIL_PAINTING: return "Classic oil painting, thick impasto brushstrokes, rich textures, cinematic lighting.";
    case VisualStyle.VINTAGE: return "1950s retro storybook style, muted nostalgic tones, grainy paper effect.";
    case VisualStyle.FLAT_ART: return "Modern flat vector illustration, organic grain texture, clean lines.";
    case VisualStyle.GHIBLI: return "Studio Ghibli style, lush green environments, hand-painted anime look.";
    case VisualStyle.PIXAR_3D: return "3D CGI animation style, subsurface scattering, vibrant lighting, soft shadows.";
    case VisualStyle.CRAYON: return "Wax crayon drawing, naive child-like strokes, thick waxy texture.";
    case VisualStyle.PAPER_CUT: return "Layered paper-cut art, distinct shadow depths, handcrafted paper texture.";
    default: return `Style: ${style}.`;
  }
};

/**
 * 风格分析引擎：将图片转换为绘图提示词
 */
const analyzeStyleImage = async (imageBase64: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/png' } },
          { text: `You are an art critic and professional prompt engineer. 
                  Analyze the artistic style of this image. 
                  Focus on: medium (e.g., charcoal, acrylic), brushstroke texture, lighting mood, and color palette.
                  Output a concise, technical English prompt description (max 50 words) that can be used to replicate this specific art style in another image. 
                  Do not describe the content of the image, only the style.` }
        ]
      }
    });
    return response.text?.trim() || "Unique artistic style";
  } catch (e) {
    return "Hand-painted artistic style";
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
    analyzedStyleDesc = await analyzeStyleImage(styleRefImage);
  }
  
  const stylePrompt = getStylePrompt(style, analyzedStyleDesc);
  
  try {
    // 步骤 1: 视觉特征深度提取
    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: characterSeedImage.split(',')[1], mimeType: 'image/png' } },
          { text: `你是一名资深角色设计师。请仔细观察这张角色设计图，提取出极其详尽的物理特征描述。
                  输出要求：一段简洁但精准的中文特征描述。` }
        ]
      }
    });
    const analyzedDesc = analysisResponse.text?.trim() || characterDesc;

    // 步骤 2 & 3: 故事文本修正与视觉指令生成
    const scriptResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `你是一名绘本导演。
                 【角色最终设定描述】 "${analyzedDesc}"
                 【画风设定】 "${stylePrompt}"
                 【任务】 修正每一页的故事文字并生成视觉分镜，确保与上述设定完全统一。
                 【待对齐页列表】 ${pages.map((p, i) => `页${i+1}: ${p.text}`).join('\n')}
                 请返回包含修正文本和视觉提示词的 JSON 数组。`,
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

    const data = JSON.parse(scriptResponse.text?.trim() || '{}');
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
  } catch (error) {
    console.error("Pipeline failed:", error);
    return { 
      pages: pages.map(p => ({ ...p, visualPrompt: `${characterDesc}, action: ${p.text}`, isGenerating: false })) as StoryPage[],
      analyzedCharacterDesc: characterDesc
    };
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
          { text: `TASK: 为绘本创作一张插画。
                    【物理基准（图）】: 严格克隆图中的五官、比例和色彩。
                    【特征逻辑】: "${analyzedCharacterDesc}"。
                    【分镜指令】: ${visualPrompt}
                    【画风锁定】: ${stylePrompt}
                    严禁文字。` }
        ]
      },
      config: { imageConfig: { aspectRatio: "1:1" }, safetySettings }
    });
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Image generation failed");
  } catch (error) { throw error; }
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
          { text: `IMAGE_EDIT_TASK: 
                    1. 修改图2: "${editInstruction}"。
                    2. 参考图1锁定角色形象。
                    3. 特征描述: "${analyzedCharacterDesc}"。
                    4. 画风保持: ${stylePrompt}。` }
        ]
      },
      config: { imageConfig: { aspectRatio: "1:1" }, safetySettings }
    });
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) { if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`; }
    }
    throw new Error("Edit failed");
  } catch (error) { throw error; }
};

export const generateStoryOutline = async (idea: string, template: StoryTemplate, imageBase64?: string): Promise<{ title: string; pages: Partial<StoryPage>[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const contents: any[] = [];
  if (imageBase64) contents.push({ inlineData: { data: imageBase64.split(',')[1], mimeType: "image/png" } });
  contents.push({ text: `请基于创意 "${idea}" 创作绘本大纲（中文）。模板: ${template}。结构：1个封面，10页正文，1个封底。仅返回 JSON。` });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: contents },
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
    const data = JSON.parse(response.text?.trim() || '{}');
    return { title: data.title || "未命名故事", pages: (data.pages || []).map((p: any, idx: number) => ({ ...p, id: generateId(), pageNumber: idx + 1 })) };
  } catch (error) { throw error; }
};

export const generateCharacterOptions = async (description: string, style: VisualStyle, referenceImageBase64?: string, styleDesc?: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const stylePrompt = getStylePrompt(style, styleDesc);
  let promptText = `CHARACTER_SHEET: ${description}. ${stylePrompt}. Full body, white background. NO TEXT.`;
  const contents: any = { parts: [{ text: promptText }] };
  if (referenceImageBase64) contents.parts.unshift({ inlineData: { data: referenceImageBase64.split(',')[1], mimeType: 'image/png' } });
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents, config: { imageConfig: { aspectRatio: "1:1" }, safetySettings } });
    const images: string[] = [];
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) { if (part.inlineData) images.push(`data:image/png;base64,${part.inlineData.data}`); }
    }
    return images;
  } catch (error) { throw error; }
};

export const generateNextPageSuggestion = async (context: string, currentStory: string): Promise<Partial<StoryPage>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `基于背景: "${context}" 和上一页: "${currentStory}"，生成后续4页脚本（中文）。仅返回 JSON。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { text: { type: Type.STRING } },
                required: ["text"]
              }
            }
          },
          required: ["suggestions"]
        }
      }
    });
    const data = JSON.parse(response.text?.trim() || '{"suggestions":[]}');
    return data.suggestions || [];
  } catch (error) { return []; }
};
