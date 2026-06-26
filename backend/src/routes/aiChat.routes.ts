import { Router } from 'express';
import {
  createConversation,
  getConversations,
  getConversationMessages,
  sendMessageInConversation,
  deleteConversation,
} from '../controllers/aiChat.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// Protect all routes
router.use(authenticate);

router.post('/', createConversation);
router.get('/', getConversations);
router.get('/:id/messages', getConversationMessages);
router.post('/:id/messages', sendMessageInConversation);
router.delete('/:id', deleteConversation);

export default router;
