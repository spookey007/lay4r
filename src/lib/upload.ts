export interface UploadResult {
  url: string;
  type: 'image' | 'gif' | 'video' | 'file';
  originalName: string;
  size: number;
  thumbnailUrl?: string;
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/chat/media/upload', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const result = await response.json();
  return result.attachment;
}

export async function uploadMultipleFiles(files: File[]): Promise<UploadResult[]> {
  const uploadPromises = files.map(file => uploadFile(file));
  return Promise.all(uploadPromises);
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (file.size > maxSize) {
    return { valid: false, error: 'File too large (max 50MB)' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not supported' };
  }

  return { valid: true };
}

export function getFileType(file: File): 'image' | 'gif' | 'video' | 'file' {
  if (file.type.startsWith('image/')) {
    return file.type === 'image/gif' ? 'gif' : 'image';
  }
  if (file.type.startsWith('video/')) {
    return 'video';
  }
  return 'file';
}
