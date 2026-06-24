import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { signToken } from '../services/jwt.service';

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
    res.json({ success: true, message: 'Logged out successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error during logout' });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.id).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, user });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
