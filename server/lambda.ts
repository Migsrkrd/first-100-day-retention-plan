// Platform-owned: do not edit. Deploy entry point (AWS Lambda).
import serverless from 'serverless-http';
import app from './app';

export const handler = serverless(app);
