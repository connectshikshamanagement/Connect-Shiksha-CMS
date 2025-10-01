const express = require('express');
const Attachment = require('../models/Attachment');
const { protect } = require('../middleware/auth');
const { upload, uploadToS3, deleteFromS3 } = require('../middleware/upload');

const router = express.Router();

router.use(protect);

// Upload file
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    // Upload to S3
    const s3Result = await uploadToS3(req.file, req.body.folder || 'general');

    // Save attachment metadata
    const attachment = await Attachment.create({
      filename: s3Result.filename,
      originalName: req.file.originalname,
      url: s3Result.url,
      s3Key: s3Result.key,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      ownerId: req.user.id,
      type: req.body.type || 'other',
      description: req.body.description,
      relatedTo: req.body.relatedTo ? {
        model: req.body.relatedToModel,
        id: req.body.relatedTo
      } : undefined
    });

    res.status(201).json({
      success: true,
      data: attachment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all attachments
router.get('/', async (req, res) => {
  try {
    const { type, relatedTo } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (relatedTo) filter['relatedTo.id'] = relatedTo;

    const attachments = await Attachment.find(filter)
      .populate('ownerId')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: attachments.length,
      data: attachments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single attachment
router.get('/:id', async (req, res) => {
  try {
    const attachment = await Attachment.findById(req.params.id).populate('ownerId');

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: attachment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete attachment
router.delete('/:id', async (req, res) => {
  try {
    const attachment = await Attachment.findById(req.params.id);

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Check if user owns the attachment or has admin rights
    if (attachment.ownerId.toString() !== req.user.id) {
      const hasAdminRights = req.user.roleIds.some(role =>
        role.key === 'FOUNDER' || role.key === 'ADMIN'
      );

      if (!hasAdminRights) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this attachment'
        });
      }
    }

    // Delete from S3
    if (attachment.s3Key) {
      await deleteFromS3(attachment.s3Key);
    }

    // Delete from database
    await attachment.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

