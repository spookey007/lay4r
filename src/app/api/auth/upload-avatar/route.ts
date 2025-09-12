import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('l4_session')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Validate file size (3MB limit)
    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size too large (max 3MB)' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Update user with avatar blob
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        avatarBlob: buffer,
        avatarUrl: `/api/avatar/${session.user.id}`
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Avatar uploaded successfully',
      avatarUrl: `/api/avatar/${session.user.id}`
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
  }
}
