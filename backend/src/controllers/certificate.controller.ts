import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { Course } from '../models/Course';
import { Certificate } from '../models/Certificate';
import { Lesson } from '../models/Lesson';
import { Progress } from '../models/Progress';
import { Enrollment } from '../models/Enrollment';
import { formatThumbnailUrl } from './course.controller';

const updateTemplateSchema = z.object({
  title: z.string().min(1).max(100),
  subTitle: z.string().min(1).max(100),
  bodyText: z.string().min(1).max(300),
  instructorName: z.string().min(1).max(100),
  instructorTitle: z.string().min(1).max(100),
  logoUrl: z.string().optional().nullable(),
  signatureUrl: z.string().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export async function getCertificateTemplate(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }

    const template = course.certificateTemplate || {
      title: 'Certificate of Completion',
      subTitle: 'This is to certify that',
      bodyText: 'has successfully completed the course',
      instructorName: '',
      instructorTitle: '',
      logoUrl: '',
      signatureUrl: '',
      primaryColor: '#000000',
      accentColor: '#3b82f6',
    };

    // Format URLs if they exist
    if (template.logoUrl) {
      template.logoUrl = formatThumbnailUrl(template.logoUrl, req);
    }
    if (template.signatureUrl) {
      template.signatureUrl = formatThumbnailUrl(template.signatureUrl, req);
    }

    res.json({ success: true, template });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function updateCertificateTemplate(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;
    const data = updateTemplateSchema.parse(req.body);

    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }

    course.certificateTemplate = {
      title: data.title,
      subTitle: data.subTitle,
      bodyText: data.bodyText,
      instructorName: data.instructorName,
      instructorTitle: data.instructorTitle,
      logoUrl: data.logoUrl || '',
      signatureUrl: data.signatureUrl || '',
      primaryColor: data.primaryColor || '#000000',
      accentColor: data.accentColor || '#3b82f6',
    };

    await course.save();

    const template = course.certificateTemplate;
    if (template.logoUrl) template.logoUrl = formatThumbnailUrl(template.logoUrl, req);
    if (template.signatureUrl) template.signatureUrl = formatThumbnailUrl(template.signatureUrl, req);

    res.json({ success: true, message: 'Certificate template updated successfully', template });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: err.flatten().fieldErrors });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function getMyCertificate(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;
    const userId = req.user!.id;

    // Check if enrolled
    const enrollment = await Enrollment.findOne({ userId, courseId, paymentStatus: 'paid' });
    if (!enrollment) {
      res.status(403).json({ success: false, message: 'Not enrolled in this course' });
      return;
    }

    const certificate = await Certificate.findOne({ userId, courseId })
      .populate('userId', 'name')
      .populate('courseId', 'title certificateTemplate');

    if (!certificate) {
      res.json({ success: true, claimed: false });
      return;
    }

    const courseObj = certificate.courseId as any;
    if (courseObj && courseObj.certificateTemplate) {
      const template = courseObj.certificateTemplate;
      if (template.logoUrl) template.logoUrl = formatThumbnailUrl(template.logoUrl, req);
      if (template.signatureUrl) template.signatureUrl = formatThumbnailUrl(template.signatureUrl, req);
    }

    res.json({ success: true, claimed: true, certificate });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function claimCertificate(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;
    const userId = req.user!.id;

    // 1. Verify enrollment
    const enrollment = await Enrollment.findOne({ userId, courseId, paymentStatus: 'paid' });
    if (!enrollment) {
      res.status(403).json({ success: false, message: 'Not enrolled in this course' });
      return;
    }

    // 2. Check if already claimed
    let certificate = await Certificate.findOne({ userId, courseId });
    if (certificate) {
      certificate = await certificate.populate([
        { path: 'userId', select: 'name' },
        { path: 'courseId', select: 'title certificateTemplate' }
      ]);

      const courseObj = certificate.courseId as any;
      if (courseObj && courseObj.certificateTemplate) {
        const template = courseObj.certificateTemplate;
        if (template.logoUrl) template.logoUrl = formatThumbnailUrl(template.logoUrl, req);
        if (template.signatureUrl) template.signatureUrl = formatThumbnailUrl(template.signatureUrl, req);
      }

      res.json({ success: true, message: 'Certificate already claimed', certificate });
      return;
    }

    // 3. Verify completion
    const course = await Course.findById(courseId);
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }

    const totalLessons = await Lesson.countDocuments({ courseId });
    const progressList = await Progress.find({ userId, courseId });
    const completedLessonsCount = progressList.filter((p) => p.completed).length;

    if (totalLessons === 0) {
      res.status(400).json({ success: false, message: 'Course has no lessons to complete' });
      return;
    }

    if (completedLessonsCount < totalLessons) {
      res.status(400).json({
        success: false,
        message: `Course not fully completed. Completed ${completedLessonsCount} out of ${totalLessons} lessons.`,
      });
      return;
    }

    // Generate unique code: CERT-XXXX-XXXX
    const code = 'CERT-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    certificate = await Certificate.create({
      userId,
      courseId,
      certificateCode: code,
      issuedAt: new Date(),
    });

    certificate = await certificate.populate([
      { path: 'userId', select: 'name' },
      { path: 'courseId', select: 'title certificateTemplate' }
    ]);

    const courseObj = certificate.courseId as any;
    if (courseObj && courseObj.certificateTemplate) {
      const template = courseObj.certificateTemplate;
      if (template.logoUrl) template.logoUrl = formatThumbnailUrl(template.logoUrl, req);
      if (template.signatureUrl) template.signatureUrl = formatThumbnailUrl(template.signatureUrl, req);
    }

    res.status(201).json({ success: true, message: 'Certificate generated successfully!', certificate });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function verifyCertificate(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.params;
    const certificate = await Certificate.findOne({ certificateCode: code.toUpperCase() })
      .populate('userId', 'name')
      .populate('courseId', 'title certificateTemplate');

    if (!certificate) {
      res.status(404).json({ success: false, message: 'Certificate not found or invalid code' });
      return;
    }

    const courseObj = certificate.courseId as any;
    if (courseObj && courseObj.certificateTemplate) {
      const template = courseObj.certificateTemplate;
      if (template.logoUrl) template.logoUrl = formatThumbnailUrl(template.logoUrl, req);
      if (template.signatureUrl) template.signatureUrl = formatThumbnailUrl(template.signatureUrl, req);
    }

    res.json({ success: true, certificate });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
