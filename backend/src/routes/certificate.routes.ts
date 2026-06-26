import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  getCertificateTemplate,
  updateCertificateTemplate,
  getMyCertificate,
  claimCertificate,
  verifyCertificate,
  listMyCertificates
} from '../controllers/certificate.controller';

const router = Router();

// Public verification route
router.get('/verify/:code', verifyCertificate);

// User certificates list
router.get('/my', authenticate, listMyCertificates);

// Course template and certificate routes
router.get('/course/:courseId/template', authenticate, getCertificateTemplate);
router.put('/course/:courseId/template', authenticate, authorize('admin'), updateCertificateTemplate);
router.get('/course/:courseId/my', authenticate, getMyCertificate);
router.post('/course/:courseId/claim', authenticate, claimCertificate);

export default router;
