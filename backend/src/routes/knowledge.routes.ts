import { Router } from 'express';
import {
  createEntry,
  getEntry,
  listEntries,
  removeEntry,
  searchEntries,
  updateEntry,
} from '../controllers/knowledge.controller.js';

const router = Router();

router.get('/', listEntries);
router.get('/search', searchEntries);
router.get('/:id', getEntry);
router.post('/', createEntry);
router.put('/:id', updateEntry);
router.delete('/:id', removeEntry);

export default router;
