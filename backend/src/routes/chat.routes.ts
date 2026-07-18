import { Router } from 'express';
import { chatOnce, streamChat } from '../controllers/chat.controller.js';

const router = Router();

router.post('/stream', streamChat);
router.post('/', chatOnce);

export default router;
