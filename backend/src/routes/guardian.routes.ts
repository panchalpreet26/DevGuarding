import { Router } from 'express';
import { compareGuardian, getGuardianReport } from '../controllers/guardian.controller.js';

const router = Router();

router.post('/compare', compareGuardian);
router.get('/:owner/:repo', getGuardianReport);

export default router;
