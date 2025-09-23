import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

export const multerConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, callback) => {
      const uniqueSuffix = randomUUID();
      const ext = extname(file.originalname);
      const filename = `${uniqueSuffix}${ext}`;
      callback(null, filename);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, callback) => {
    // Allow images and PDFs
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif|pdf)$/)) {
      callback(null, true);
    } else {
      callback(new Error('Only image and PDF files are allowed'), false);
    }
  },
};

export const photoUploadConfig = {
  storage: diskStorage({
    destination: './uploads/photos',
    filename: (req, file, callback) => {
      const uniqueSuffix = randomUUID();
      const ext = extname(file.originalname);
      const filename = `${uniqueSuffix}${ext}`;
      callback(null, filename);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, callback) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
      callback(null, true);
    } else {
      callback(new Error('Only image files are allowed'), false);
    }
  },
};

export const horoscopeUploadConfig = {
  storage: diskStorage({
    destination: './uploads/horoscopes',
    filename: (req, file, callback) => {
      const uniqueSuffix = randomUUID();
      const ext = extname(file.originalname);
      const filename = `${uniqueSuffix}${ext}`;
      callback(null, filename);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, callback) => {
    if (file.mimetype.match(/\/(pdf|jpg|jpeg|png)$/)) {
      callback(null, true);
    } else {
      callback(new Error('Only PDF and image files are allowed'), false);
    }
  },
};
