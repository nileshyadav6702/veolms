import { Request, Response } from 'express';
import { AIConversation } from '../models/AIConversation';
import { ChatMessage } from '../models/ChatMessage';
import { Lesson } from '../models/Lesson';
import { User } from '../models/User';
import { GoogleGenAI } from '@google/genai';
import { OpenAI } from 'openai';
import { getCleanTranscript } from '../services/transcript.service';

export async function createConversation(req: Request, res: Response): Promise<void> {
  try {
    const { title, lessonId } = req.body;
    if (!title) {
      res.status(400).json({ success: false, message: 'Conversation title is required' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const conversation = await AIConversation.create({
      userId: req.user.id,
      title: title.trim(),
      lessonId: lessonId || undefined,
    });

    res.status(201).json({ success: true, conversation });
  } catch (err: any) {
    console.error('[Create Conversation Error]:', err);
    res.status(500).json({ success: false, message: 'Server error creating conversation' });
  }
}

export async function getConversations(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const conversations = await AIConversation.find({ userId: req.user.id })
      .populate('lessonId', 'title')
      .sort({ updatedAt: -1 });

    res.json({ success: true, conversations });
  } catch (err: any) {
    console.error('[Get Conversations Error]:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving conversations' });
  }
}

export async function getConversationMessages(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const conversation = await AIConversation.findOne({ _id: id, userId: req.user.id });
    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }

    const messages = await ChatMessage.find({ conversationId: conversation._id }).sort({ createdAt: 1 });

    res.json({
      success: true,
      history: messages.map((m) => ({
        sender: m.sender,
        text: m.text,
        createdAt: m.createdAt,
      })),
    });
  } catch (err: any) {
    console.error('[Get Conversation Messages Error]:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving messages' });
  }
}

export async function sendMessageInConversation(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      res.status(400).json({ success: false, message: 'Message is required' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const conversation = await AIConversation.findOne({ _id: id, userId: req.user.id });
    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }

    // Save user message to the database
    await ChatMessage.create({
      userId: req.user.id,
      conversationId: conversation._id,
      lessonId: conversation.lessonId || undefined,
      sender: 'user',
      text: message,
    });

    // 1. Fetch transcript if lesson context exists
    let transcript = '';
    let lessonTitle = 'General Assistant';
    let lessonDescription = 'No lesson context linked.';

    if (conversation.lessonId) {
      const lesson = await Lesson.findById(conversation.lessonId);
      if (lesson) {
        lessonTitle = lesson.title;
        lessonDescription = lesson.description || '';
        const subtitle = lesson.subtitles?.find((s) => s.lang === 'en') || lesson.subtitles?.[0];
        if (subtitle?.vttKey) {
          transcript = await getCleanTranscript(subtitle.vttKey);
        }
      }
    }

    // 2. Load student's profile to resolve settings
    const student = await User.findById(req.user.id).select('+aiSettings.apiKey');
    
    // Choose provider and model
    const provider = student?.aiSettings?.provider || 'gemini';
    const model = student?.aiSettings?.model || (provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini');

    // Resolve API Key
    let apiKey = '';
    if (student?.aiSettings?.provider === provider && student?.aiSettings?.apiKey) {
      apiKey = student.aiSettings.apiKey;
    } else {
      apiKey = provider === 'gemini' ? (process.env.GEMINI_API_KEY || '') : (process.env.OPENAI_API_KEY || '');
    }

    if (!apiKey) {
      res.status(400).json({
        success: false,
        message: `API key for provider "${provider}" is not configured. Please supply an API key in your Profile Settings or contact the administrator.`,
      });
      return;
    }

    // Retrieve full chat history from DB to pass as context (linked to this conversation)
    const chatHistory = await ChatMessage.find({
      conversationId: conversation._id,
    }).sort({ createdAt: 1 });

    // 3. System Instruction
    const systemInstruction = `You are a helpful and knowledgeable AI Course Assistant.
${conversation.lessonId ? `You are specifically helping the student with the video lesson titled "${lessonTitle}".` : 'You are helping the student with general queries.'}

Lesson/Context Description:
"${lessonDescription}"

${conversation.lessonId ? `Video Speech Transcript:
---
${transcript || 'No transcript/subtitles are available for this video lesson. Answer using general knowledge about the topic, but note that you do not have the exact video transcript.'}
---` : ''}

Instructions:
- Keep your answers concise, educational, clear, and direct.
- Ground your answers in what the instructor says in the transcript whenever applicable.
- If the student's question is completely irrelevant to learning or the course/lesson topic, politely guide them back.
- Use markdown formatting for lists, code snippets, or bold text to make it easy to read.`;

    let reply = '';

    if (provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey });
      const geminiHistory = chatHistory.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      const response = await ai.models.generateContent({
        model: model,
        contents: geminiHistory,
        config: { systemInstruction },
      });
      reply = response.text || '';
    } else if (provider === 'openai') {
      const openai = new OpenAI({ apiKey });
      const openaiHistory = chatHistory.map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));

      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: systemInstruction },
          ...openaiHistory,
        ],
      });
      reply = response.choices[0]?.message?.content || '';
    } else {
      res.status(400).json({ success: false, message: `Unsupported provider: ${provider}` });
      return;
    }

    // Save AI's response to the database
    await ChatMessage.create({
      userId: req.user.id,
      conversationId: conversation._id,
      lessonId: conversation.lessonId || undefined,
      sender: 'ai',
      text: reply,
    });

    // Touch conversation to update its updatedAt field
    conversation.updatedAt = new Date();
    await conversation.save();

    res.json({ success: true, reply });
  } catch (error: any) {
    console.error('[sendMessageInConversation Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'AI generation failed' });
  }
}

export async function deleteConversation(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const conversation = await AIConversation.findOne({ _id: id, userId: req.user.id });
    if (!conversation) {
      res.status(404).json({ success: false, message: 'Conversation not found' });
      return;
    }

    // Delete conversation and messages
    await AIConversation.deleteOne({ _id: conversation._id });
    await ChatMessage.deleteMany({ conversationId: conversation._id });

    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (err: any) {
    console.error('[Delete Conversation Error]:', err);
    res.status(500).json({ success: false, message: 'Server error deleting conversation' });
  }
}
