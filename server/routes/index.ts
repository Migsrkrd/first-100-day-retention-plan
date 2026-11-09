// Mount every route module here. routes.use('/notes', notesRouter) serves
// /api/notes. A route file that is not mounted here is never reachable.
import { Router } from 'express';

export const routes = Router();
