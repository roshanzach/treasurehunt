import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../prisma';
import { generateAccessKey, generateQRIdentifier } from '../utils/keyGenerator';

export async function getAllQuestions(req: Request, res: Response): Promise<void> {
  try {
    const questions = await prisma.question.findMany({
      orderBy: { level: 'asc' },
    });
    res.json({ questions });
  } catch (error) {
    console.error('getAllQuestions error:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
}

export async function getQuestionById(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const question = await prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    res.json({ question });
  } catch (error) {
    console.error('getQuestionById error:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
}

export async function createQuestion(req: Request, res: Response): Promise<void> {
  try {
    const {
      level,
      locationName,
      title,
      questionType,
      questionContent,
      questionMediaUrl,
      correctAnswer,
      locationHintType,
      locationHintContent,
      locationHintMediaUrl,
      customAccessKey,
      isActive,
    } = req.body;

    if (!title || !questionContent || !correctAnswer || !locationHintContent) {
      res.status(400).json({
        error: 'Title, question content, correct answer, and location hint are required.',
      });
      return;
    }

    // Determine level if not supplied
    let questionLevel = level ? parseInt(level, 10) : 1;
    if (!level) {
      const highestQuestion = await prisma.question.findFirst({
        orderBy: { level: 'desc' },
      });
      questionLevel = (highestQuestion?.level || 0) + 1;
    }

    // Check if level is taken
    const existing = await prisma.question.findUnique({
      where: { level: questionLevel },
    });
    if (existing) {
      res.status(400).json({
        error: `Question at level ${questionLevel} already exists. Please choose a different level or reorder.`,
      });
      return;
    }

    // Generate 6-char access key
    const accessKey = customAccessKey
      ? customAccessKey.trim().toUpperCase()
      : generateAccessKey(6);

    const qrIdentifier = generateQRIdentifier(questionLevel);

    const question = await prisma.question.create({
      data: {
        level: questionLevel,
        locationName: locationName ? locationName.trim() : null,
        title,
        questionType: questionType || 'TEXT',
        questionContent,
        questionMediaUrl: questionMediaUrl || null,
        correctAnswer: correctAnswer.trim(),
        locationHintType: locationHintType || 'TEXT',
        locationHintContent,
        locationHintMediaUrl: locationHintMediaUrl || null,
        accessKey,
        qrIdentifier,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json({
      message: 'Question created successfully',
      question,
    });
  } catch (error) {
    console.error('createQuestion error:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
}

export async function updateQuestion(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const {
      title,
      locationName,
      questionType,
      questionContent,
      questionMediaUrl,
      correctAnswer,
      locationHintType,
      locationHintContent,
      locationHintMediaUrl,
      accessKey,
      isActive,
      level,
    } = req.body;

    const existing = await prisma.question.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    // If level is changing, verify no conflict
    if (level && parseInt(level, 10) !== existing.level) {
      const conflict = await prisma.question.findUnique({
        where: { level: parseInt(level, 10) },
      });
      if (conflict && conflict.id !== id) {
        res.status(400).json({
          error: `Level ${level} is already assigned to another question.`,
        });
        return;
      }
    }

    const updated = await prisma.question.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        locationName: locationName !== undefined ? (locationName ? locationName.trim() : null) : existing.locationName,
        level: level ? parseInt(level, 10) : existing.level,
        questionType: questionType !== undefined ? questionType : existing.questionType,
        questionContent: questionContent !== undefined ? questionContent : existing.questionContent,
        questionMediaUrl: questionMediaUrl !== undefined ? questionMediaUrl : existing.questionMediaUrl,
        correctAnswer: correctAnswer !== undefined ? correctAnswer.trim() : existing.correctAnswer,
        locationHintType: locationHintType !== undefined ? locationHintType : existing.locationHintType,
        locationHintContent: locationHintContent !== undefined ? locationHintContent : existing.locationHintContent,
        locationHintMediaUrl: locationHintMediaUrl !== undefined ? locationHintMediaUrl : existing.locationHintMediaUrl,
        accessKey: accessKey ? accessKey.trim().toUpperCase() : existing.accessKey,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    res.json({
      message: 'Question updated successfully',
      question: updated,
    });
  } catch (error) {
    console.error('updateQuestion error:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
}

export async function deleteQuestion(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    await prisma.question.delete({
      where: { id },
    });
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('deleteQuestion error:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
}

export async function regenerateAccessKey(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const newKey = generateAccessKey(6);

    const question = await prisma.question.update({
      where: { id },
      data: { accessKey: newKey },
    });

    res.json({
      message: 'Access key regenerated successfully',
      accessKey: question.accessKey,
      question,
    });
  } catch (error) {
    console.error('regenerateAccessKey error:', error);
    res.status(500).json({ error: 'Failed to regenerate access key' });
  }
}

export async function getQuestionQRCode(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const question = await prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    // Determine full hunt URL
    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol === 'https' ? 'https' : 'http';
    const clientUrl = `${protocol}://${host}/hunt?qr=${question.qrIdentifier}`;

    const qrDataUrl = await QRCode.toDataURL(clientUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    res.json({
      level: question.level,
      locationName: question.locationName,
      title: question.title,
      accessKey: question.accessKey,
      qrIdentifier: question.qrIdentifier,
      huntUrl: clientUrl,
      qrDataUrl,
    });
  } catch (error) {
    console.error('getQuestionQRCode error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
}

export const DECOY_CHECKPOINTS = [
  {
    id: 'decoy-1',
    code: 'QR-DECOY-VAULT-01',
    title: 'The Hidden Archive',
    locationName: 'Mystery Vault',
    accessKey: 'VAULT9',
    tag: 'CAMPUS DECOY CHECKPOINT',
    subtitle: 'Secret Vault Checkpoint',
  },
  {
    id: 'decoy-2',
    code: 'QR-DECOY-STAIRS-02',
    title: 'The Forgotten Stairwell',
    locationName: 'Secret Overpass',
    accessKey: 'PASS7X',
    tag: 'CAMPUS DECOY CHECKPOINT',
    subtitle: 'Overpass Checkpoint',
  },
  {
    id: 'decoy-3',
    code: 'QR-DECOY-GROVE-03',
    title: 'The Shaded Grove',
    locationName: 'Ancient Botanical Relic',
    accessKey: 'RELIC4',
    tag: 'CAMPUS DECOY CHECKPOINT',
    subtitle: 'Grove Checkpoint',
  },
  {
    id: 'decoy-4',
    code: 'QR-DECOY-PILLAR-04',
    title: 'Quadrangle Concrete Pillar',
    locationName: 'Shadow Passage',
    accessKey: 'SHAD8M',
    tag: 'CAMPUS DECOY CHECKPOINT',
    subtitle: 'Passage Checkpoint',
  },
  {
    id: 'decoy-5',
    code: 'QR-DECOY-YARD-05',
    title: 'Old Transformer Yard',
    locationName: 'Campus Labyrinth',
    accessKey: 'LABY2Z',
    tag: 'CAMPUS DECOY CHECKPOINT',
    subtitle: 'Labyrinth Checkpoint',
  },
  {
    id: 'decoy-6',
    code: 'QR-DECOY-BALCONY-06',
    title: 'The High Balcony',
    locationName: 'Enigma Citadel',
    accessKey: 'ENIG3K',
    tag: 'CAMPUS DECOY CHECKPOINT',
    subtitle: 'Citadel Checkpoint',
  },
  {
    id: 'decoy-7',
    code: 'QR-DECOY-BASEMENT-07',
    title: 'Basement Corridors',
    locationName: 'Phantom Archives',
    accessKey: 'PHAN5R',
    tag: 'CAMPUS DECOY CHECKPOINT',
    subtitle: 'Archive Checkpoint',
  },
  {
    id: 'decoy-8',
    code: 'QR-DECOY-BOTANIC-08',
    title: 'Botanical Perimeter',
    locationName: 'Lost Campus Caché',
    accessKey: 'LOST1W',
    tag: 'CAMPUS DECOY CHECKPOINT',
    subtitle: 'Caché Checkpoint',
  },
];

export async function getFakeQRCodes(req: Request, res: Response): Promise<void> {
  try {
    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol === 'https' ? 'https' : 'http';

    const fakeQRCodes = await Promise.all(
      DECOY_CHECKPOINTS.map(async (decoy, index) => {
        const clientUrl = `${protocol}://${host}/fake-qr?code=${decoy.code}`;
        const qrDataUrl = await QRCode.toDataURL(clientUrl, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 400,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });

        return {
          id: decoy.id,
          level: `DECOY #${index + 1}`,
          decoyNumber: index + 1,
          locationName: decoy.locationName,
          title: decoy.title,
          accessKey: decoy.accessKey,
          qrIdentifier: decoy.code,
          tag: decoy.tag,
          subtitle: decoy.subtitle,
          huntUrl: clientUrl,
          qrDataUrl,
          trollImage: '/fake-qr-troll.jpg',
          trollQuote:
            'ഇരുട്ടുപിടിച്ച മൂലകളിൽ കയറി കണ്ട കറുപ്പും വെളുപ്പും വരകളൊക്കെ സ്കാൻ ചെയ്യാനാണോ നിന്നെ വീട്ടുകാർ കോളേജിലോട്ട് വിട്ടത്?',
        };
      })
    );

    res.json({
      fakeQRCodes,
      trollImage: '/fake-qr-troll.jpg',
      trollQuote:
        'ഇരുട്ടുപിടിച്ച മൂലകളിൽ കയറി കണ്ട കറുപ്പും വെളുപ്പും വരകളൊക്കെ സ്കാൻ ചെയ്യാനാണോ നിന്നെ വീട്ടുകാർ കോളേജിലോട്ട് വിട്ടത്?',
    });
  } catch (error) {
    console.error('getFakeQRCodes error:', error);
    res.status(500).json({ error: 'Failed to generate decoy QR codes' });
  }
}
