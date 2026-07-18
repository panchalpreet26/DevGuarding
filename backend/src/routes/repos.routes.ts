import { Router } from 'express';
import { getRepository, listRepos } from '../controllers/repos.controller.js';

const router = Router();

router.get('/', listRepos);
router.get('/:owner/:repo', getRepository);

export default router;
