import { Router } from 'express';
import healthRoutes from './health.routes.js';
import reposRoutes from './repos.routes.js';
import analysisRoutes from './analysis.routes.js';
import chatRoutes from './chat.routes.js';
import knowledgeRoutes from './knowledge.routes.js';
import guardianRoutes from './guardian.routes.js';

/** Root API router. Feature routers are mounted here as milestones land. */
const router = Router();

router.use('/health', healthRoutes);
router.use('/repos', reposRoutes);
router.use('/analysis', analysisRoutes);
router.use('/chat', chatRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/guardian', guardianRoutes);
// Milestone 2: router.use('/auth', authRoutes);

export default router;
