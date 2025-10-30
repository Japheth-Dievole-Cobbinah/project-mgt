import express from 'express'
import { addMember, getUserWorkspace } from '../controllers/workspaceController.js';

const workspaceRouter = express.Router();

workspaceRouter.get('/', getUserWorkspace);
workspaceRouter.post('/add-member', addMember);


export default workspaceRouter;