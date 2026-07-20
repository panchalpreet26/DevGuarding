import { Router } from 'express';
import {
  compareGuardian,
  compareRepoSpecGuardian,
  draftOpenApiGuardian,
  getGuardianReport,
  scanClientsGuardian,
} from '../controllers/guardian.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/compare', requireAuth, compareGuardian);
router.post('/scan-clients', requireAuth, scanClientsGuardian);
router.post('/compare-repo-spec', requireAuth, compareRepoSpecGuardian);
router.post('/draft-openapi', requireAuth, draftOpenApiGuardian);
router.get('/:owner/:repo', requireAuth, getGuardianReport);

export default router;
