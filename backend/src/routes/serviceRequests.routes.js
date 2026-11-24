import express from 'express';
import { body } from 'express-validator';
import * as controller from '../controllers/serviceRequests.controller.js';
import validateBody from '../middlewares/validateBody.middleware.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { SERVICE_TYPES } from '../utils/serviceTypes.js';

const router = express.Router();

// Any signed-in user
router.get('/types', authenticate, controller.listTypes);
router.get('/my-requests', authenticate, controller.getMine);
router.post(
    '/',
    authenticate,
    [
        body('service_type').isIn(SERVICE_TYPES).withMessage('Please choose a valid service type'),
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('description').trim().notEmpty().withMessage('Description is required'),
        body('location').optional().trim(),
    ],
    validateBody,
    controller.create
);
router.get('/:id', authenticate, controller.get);

// Admin only
router.get('/', authenticate, authorize(['admin']), controller.list);
router.patch(
    '/:id/status',
    authenticate,
    authorize(['admin']),
    [
        body('status').isIn(controller.STATUSES).withMessage('Invalid status'),
        body('admin_note').optional({ values: 'null' }).trim(),
    ],
    validateBody,
    controller.updateStatus
);

export default router;
