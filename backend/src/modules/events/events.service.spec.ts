import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from './storage.service';
import { EventsService } from './events.service';

describe('EventsService', () => {
  let service: EventsService;

  const prismaMock = {
    event: {
      create: jest.fn(),
    },
    plant: {
      findUnique: jest.fn(),
    },
    cycle: {
      findUnique: jest.fn(),
    },
    section: {
      findUnique: jest.fn(),
    },
  };

  const storageMock = {
    isAvailable: jest.fn(),
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const file = {
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    destination: '',
    filename: '',
    path: '',
    buffer: Buffer.from('image-bytes'),
    stream: null,
  } as unknown as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EventsService(
      prismaMock as unknown as PrismaService,
      storageMock as unknown as StorageService,
    );

    prismaMock.plant.findUnique.mockResolvedValue({ id: 'plant-1' });
  });

  it('rolls back uploaded file when DB persistence fails', async () => {
    storageMock.isAvailable.mockReturnValue(true);
    storageMock.uploadFile.mockResolvedValue({
      url: 'https://cdn.example/photo.jpg',
      path: 'photos/photo.jpg',
    });
    prismaMock.event.create.mockRejectedValue(new Error('db write failed'));

    await expect(
      service.createPhotoEvent(
        { plantId: 'plant-1', caption: 'test' },
        file,
      ),
    ).rejects.toThrow('db write failed');

    expect(storageMock.deleteFile).toHaveBeenCalledWith('photos/photo.jpg');
  });

  it('uses local fallback when external storage is unavailable', async () => {
    storageMock.isAvailable.mockReturnValue(false);
    prismaMock.event.create.mockResolvedValue({ id: 'event-1' });

    await expect(
      service.createPhotoEvent(
        { plantId: 'plant-1', caption: 'fallback' },
        file,
      ),
    ).resolves.toMatchObject({ id: 'event-1' });

    expect(storageMock.uploadFile).not.toHaveBeenCalled();
    expect(storageMock.deleteFile).not.toHaveBeenCalled();
  });

  it('rejects fallback storage for very large files', async () => {
    storageMock.isAvailable.mockReturnValue(false);
    const largeFile = {
      ...file,
      size: 6 * 1024 * 1024,
    } as Express.Multer.File;

    await expect(
      service.createPhotoEvent(
        { plantId: 'plant-1', caption: 'too big' },
        largeFile,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
