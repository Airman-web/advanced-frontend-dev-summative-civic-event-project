import db from '../config/db.js';

const WITH_USER = `
    SELECT sr.*, u.full_name, u.email
    FROM service_requests sr
    JOIN users u ON sr.user_id = u.id`;

export const create = async ({ user_id, service_type, title, description, location }) => {
    const res = await db.query(
        `INSERT INTO service_requests (user_id, service_type, title, description, location)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [user_id, service_type, title, description, location || null]
    );
    return res.rows[0];
};

export const findAll = async () => {
    const res = await db.query(`${WITH_USER} ORDER BY sr.created_at DESC`);
    return res.rows;
};

export const findByUser = async (user_id) => {
    const res = await db.query(
        'SELECT * FROM service_requests WHERE user_id = $1 ORDER BY created_at DESC',
        [user_id]
    );
    return res.rows;
};

export const findById = async (id) => {
    const res = await db.query(`${WITH_USER} WHERE sr.id = $1`, [id]);
    return res.rows[0] || null;
};

export const updateStatus = async (id, { status, admin_note }) => {
    const res = await db.query(
        `UPDATE service_requests
         SET status = $1, admin_note = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [status, admin_note ?? null, id]
    );
    return res.rows[0];
};
