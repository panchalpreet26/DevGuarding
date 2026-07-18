import { Router } from 'express';
import { getAnalysis, runAnalysis } from '../controllers/analysis.controller.js';

const router = Router();

router.post('/', runAnalysis);
router.get('/:owner/:repo', getAnalysis);

export default router;
