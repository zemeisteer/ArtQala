import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireAdmin, createSessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { old_password, new_password } = await request.json();

    if (!new_password) {
      return NextResponse.json(
        { success: false, error: 'Yangi parol kiritilishi shart' },
        { status: 400 }
      );
    }

    if (new_password.length < 8 || !/[A-Z]/.test(new_password) || !/[0-9]/.test(new_password)) {
      return NextResponse.json(
        {
          success: false,
          error: "Yangi parol kamida 8 ta belgi, 1 ta katta harf va 1 ta raqamdan iborat bo'lishi shart",
        },
        { status: 400 }
      );
    }

    const admin = await prisma.user.findUnique({
      where: { id: auth.user.id },
    });

    if (!admin || !admin.password_hash) {
      return NextResponse.json(
        { success: false, error: 'Admin hisobi topilmadi' },
        { status: 404 }
      );
    }

    // If admin already had a custom password, verify old password
    if (old_password) {
      const isValid = await bcrypt.compare(old_password, admin.password_hash);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Eski parol noto'g'ri kiritildi" },
          { status: 400 }
        );
      }
    }

    const newHash = await bcrypt.hash(new_password, 10);

    const updated = await prisma.user.update({
      where: { id: admin.id },
      data: {
        password_hash: newHash,
        must_change_password: false,
      },
    });

    const updatedSession = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      country: updated.country,
      role: updated.role,
      email_verified: updated.email_verified,
    };

    // Same sign-in continues on this device; the admin's other devices are
    // signed out, since the old password may be what leaked.
    const sid = auth.user.sid;
    await prisma.adminSession.updateMany({
      where: { user_id: updated.id, ended_at: null, ...(sid ? { NOT: { id: sid } } : {}) },
      data: { ended_at: new Date(), end_reason: 'REVOKED' },
    });
    const token = createSessionToken({ ...updatedSession, sid });

    const response = NextResponse.json({
      success: true,
      message: "Admin paroli muvaffaqiyatli yangilandi",
      user: updatedSession,
    });

    response.cookies.set('artqala_user', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, error: 'Parolni yangilashda server xatosi' },
      { status: 500 }
    );
  }
}
