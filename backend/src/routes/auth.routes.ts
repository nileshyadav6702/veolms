import { Router } from 'express';
import { signup, login, logout, me, updateAiSettings } from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.put('/ai-settings', authenticate, updateAiSettings);

export default router;
