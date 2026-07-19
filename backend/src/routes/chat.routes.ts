import { Router } from 'express';
import { chatOnce, streamChat } from '../controllers/chat.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/stream', requireAuth, streamChat);
router.post('/', requireAuth, chatOnce);

export default router;
