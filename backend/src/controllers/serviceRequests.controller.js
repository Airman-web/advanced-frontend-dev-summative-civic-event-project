import * as ServiceRequests from '../models/serviceRequests.model.js';
import * as Notifications from '../models/notifications.model.js';
import { SERVICE_TYPES } from '../utils/serviceTypes.js';

export const STATUSES = ['pending', 'in_progress', 'resolved', 'rejected'];
const STATUS_LABELS = { pending: 'Pending', in_progress: 'In progress', resolved: 'Resolved', rejected: 'Rejected' };

export const listTypes = (req, res) => {
    res.status(200).json({ status: 200, message: 'Service types retrieved successfully', data: SERVICE_TYPES });
};

export const create = async (req, res, next) => {
    try {
        const { service_type, title, description, location } = req.body;
        const request = await ServiceRequests.create({ user_id: req.user.id, service_type, title, description, location });
        res.status(201).json({ status: 201, message: 'Service request submitted', data: request });
    } catch (err) {
        next(err);
    }
};

export const getMine = async (req, res, next) => {
    try {
        const data = await ServiceRequests.findByUser(req.user.id);
        res.status(200).json({ status: 200, message: 'Service requests retrieved successfully', data });
    } catch (err) {
        next(err);
    }
};

export const list = async (req, res, next) => {
    try {
        const data = await ServiceRequests.findAll();
        res.status(200).json({ status: 200, message: 'Service requests retrieved successfully', data });
    } catch (err) {
        next(err);
    }
};

// Owners can view their own request; admins can view any.
export const get = async (req, res, next) => {
    try {
        const request = await ServiceRequests.findById(req.params.id);
        if (!request) return res.status(404).json({ status: 404, message: 'Service request not found' });
        if (req.user.role !== 'admin' && request.user_id !== req.user.id) {
            return res.status(403).json({ status: 403, message: 'Forbidden: insufficient permissions' });
        }
        res.status(200).json({ status: 200, message: 'Service request retrieved successfully', data: request });
    } catch (err) {
        next(err);
    }
};

// Admin status update; the resident receives a targeted notification.
export const updateStatus = async (req, res, next) => {
    try {
        const existing = await ServiceRequests.findById(req.params.id);
        if (!existing) return res.status(404).json({ status: 404, message: 'Service request not found' });

        const { status, admin_note } = req.body;
        const updated = await ServiceRequests.updateStatus(req.params.id, { status, admin_note });

        await Notifications.create({
            title: 'Service request update',
            message: `Your request "${existing.title}" is now ${STATUS_LABELS[status]}.${admin_note ? ` Note: ${admin_note}` : ''}`,
            type: 'service_request',
            recipient_id: existing.user_id,
            metadata: { service_request_id: existing.id },
            created_by: req.user.id,
        });

        res.status(200).json({ status: 200, message: 'Service request updated', data: updated });
    } catch (err) {
        next(err);
    }
};
