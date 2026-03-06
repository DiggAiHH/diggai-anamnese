import { Router } from 'express';
import type { Request, Response } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import * as multer from 'multer';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Configure Multer storage
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, 'uploads/'); // Make sure this folder exists
    },
    filename: (_req, file, cb) => {
        // Generate a secure, random filename to prevent overwriting and path traversal
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// Filter for safe file types
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Ungültiger Dateityp. Nur JPG, PNG und PDF sind erlaubt.'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB limit
    }
});

/**
 * POST /api/upload
 * Lädt ein Dokument hoch und gibt den Dateinamen zurück.
 * (Scanner-Vermeider Feature)
 */
router.post('/', requireAuth, upload.single('document'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'Keine Datei hochgeladen' });
            return;
        }

        // Return the path so the frontend can save it as an Answer
        res.json({
            success: true,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size
        });
    } catch (err: unknown) {
        console.error('[Upload] Fehler:', err);
        const message = err instanceof Error ? err.message : 'Fehler beim Datei-Upload';
        res.status(500).json({ error: message });
    }
});

/**
 * GET /api/upload/:filename
 * Lädt ein hochgeladenes Dokument herunter.
 */
router.get('/:filename', requireAuth, async (req: Request, res: Response) => {
    try {
        const filename = req.params.filename as string;
        const filepath = path.join(process.cwd(), 'uploads', filename);

        // Security check: ensure path is within uploads directory
        if (!filepath.startsWith(path.join(process.cwd(), 'uploads'))) {
            res.status(403).json({ error: 'Zugriff verweigert' });
            return;
        }

        // Ideally, we restrict this via auth. We'll do a simple check.
        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'DOWNLOAD_DOCUMENT',
                resource: `uploads/${filename}`,
                metadata: JSON.stringify({ filename })
            }
        });

        res.download(filepath);
    } catch (err: unknown) {
        console.error('[Download] Fehler:', err);
        res.status(500).json({ error: 'Fehler beim Herunterladen der Datei' });
    }
});

export default router;
