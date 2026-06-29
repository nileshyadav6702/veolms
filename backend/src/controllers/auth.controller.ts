import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { signToken, signRefreshToken, verifyRefreshToken } from '../services/jwt.service';
import { config } from '../config/env';

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  sessionIdToRevoke: z.string().optional(),
});

export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = signupSchema.parse(req.body);
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role: 'student', lastLogin: new Date() });
    
    // Create initial session for the signup
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const ip = req.ip || req.socket.remoteAddress || 'Unknown IP';
    const session = await Session.create({
      userId: user._id,
      deviceInfo: userAgent,
      ipAddress: ip,
      lastActive: new Date()
    });

    const token = signToken({ 
      id: user._id.toString(), 
      email: user.email, 
      role: user.role,
      sessionId: session._id.toString() 
    });

    const refreshToken = signRefreshToken({
      id: user._id.toString(),
      sessionId: session._id.toString()
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation error', errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, sessionIdToRevoke } = loginSchema.parse(req.body);
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // If requested to revoke a specific session
    if (sessionIdToRevoke) {
      await Session.findOneAndDelete({ _id: sessionIdToRevoke, userId: user._id });
    }

    // Stateful authentication - check concurrent devices
    const activeSessions = await Session.find({ userId: user._id }).sort({ lastActive: -1 });
    if (activeSessions.length >= 2) {
      res.status(409).json({
        success: false,
        code: 'DEVICE_LIMIT_REACHED',
        message: 'Maximum device limit reached (2). Choose an active session to terminate and log in.',
        sessions: activeSessions.map(s => ({
          id: s._id,
          deviceInfo: s.deviceInfo,
          ipAddress: s.ipAddress,
          lastActive: s.lastActive
        }))
      });
      return;
    }

    // Create session record
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const ip = req.ip || req.socket.remoteAddress || 'Unknown IP';
    const session = await Session.create({
      userId: user._id,
      deviceInfo: userAgent,
      ipAddress: ip,
      lastActive: new Date()
    });

    // Update user's last login
    user.lastLogin = new Date();
    await user.save();

    const token = signToken({ 
      id: user._id.toString(), 
      email: user.email, 
      role: user.role,
      sessionId: session._id.toString() 
    });

    const refreshToken = signRefreshToken({
      id: user._id.toString(),
      sessionId: session._id.toString()
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation error', errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    // Delete session from DB
    if (req.user?.sessionId) {
      await Session.findByIdAndDelete(req.user.sessionId);
    }
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error during logout' });
  }
}

const updateAiSettingsSchema = z.object({
  provider: z.enum(['gemini', 'openai']),
  model: z.string().min(1),
  apiKey: z.string().optional().nullable(),
});

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.id).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const userObj = user.toObject() as any;
    if (userObj.aiSettings) {
      const rawUser = await User.findById(user._id).select('+aiSettings.apiKey');
      userObj.aiSettings.hasKey = !!rawUser?.aiSettings?.apiKey;
    }

    res.json({ success: true, user: userObj });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateAiSettings(req: Request, res: Response): Promise<void> {
  try {
    const { provider, model, apiKey } = updateAiSettingsSchema.parse(req.body);
    const updateData: any = {
      'aiSettings.provider': provider,
      'aiSettings.model': model,
    };

    if (apiKey === null || apiKey === '') {
      updateData['aiSettings.apiKey'] = null;
    } else if (apiKey !== undefined) {
      updateData['aiSettings.apiKey'] = apiKey;
    }

    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { $set: updateData },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const userObj = user.toObject() as any;
    if (userObj.aiSettings) {
      const rawUser = await User.findById(user._id).select('+aiSettings.apiKey');
      userObj.aiSettings.hasKey = !!rawUser?.aiSettings?.apiKey;
    }

    res.json({ success: true, user: userObj });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation error', errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getSessions(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const sessions = await Session.find({ userId: req.user.id }).sort({ lastActive: -1 });
    res.json({ success: true, sessions });
  } catch (err) {
    console.error('[Get Sessions Error]:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving sessions' });
  }
}

export async function revokeSession(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const session = await Session.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    res.json({ success: true, message: 'Session terminated successfully' });
  } catch (err) {
    console.error('[Revoke Session Error]:', err);
    res.status(500).json({ success: false, message: 'Server error revoking session' });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ success: false, message: 'No refresh token provided' });
      return;
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
      return;
    }

    // Stateful check: verify session exists in DB
    const session = await Session.findById(payload.sessionId);
    if (!session) {
      res.status(401).json({ success: false, message: 'Session expired or revoked' });
      return;
    }

    const user = await User.findById(payload.id);
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    // Generate a new short-lived access token
    const accessToken = signToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId: session._id.toString(),
    });

    // Rotate the refresh token
    const newRefreshToken = signRefreshToken({
      id: user._id.toString(),
      sessionId: session._id.toString(),
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      token: accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[Refresh Token Error]:', err);
    res.status(500).json({ success: false, message: 'Server error during token refresh' });
  }
}
