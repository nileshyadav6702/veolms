import { Router } from 'express';
import { signup, login, logout, me, updateAiSettings, getSessions, revokeSession, refresh } from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.post('/refresh', refresh);
router.get('/me', authenticate, me);
router.put('/ai-settings', authenticate, updateAiSettings);
router.get('/sessions', authenticate, getSessions);
router.delete('/sessions/:id', authenticate, revokeSession);

export default router;
