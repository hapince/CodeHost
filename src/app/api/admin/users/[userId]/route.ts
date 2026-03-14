import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, isNextResponse } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// Get single user details
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        balance: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            ownedProjects: true,
            purchases: true,
            comments: true,
            projectMembers: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User does not exist' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}

// Update user information
export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    const body = await req.json();
    const { name, email, balance, role, avatar, resetPassword } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (balance !== undefined) updateData.balance = parseFloat(balance);
    if (role !== undefined) updateData.role = role;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (resetPassword) {
      updateData.passwordHash = await bcrypt.hash(resetPassword, 10);
    }

    const user = await prisma.user.update({
      where: { id: params.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        balance: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'This email is already in use' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// Delete user
export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const admin = await requireAdmin(req);
  if (isNextResponse(admin)) return admin;

  try {
    // Cannot delete yourself
    if (params.userId === admin.userId) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: params.userId } });
    return NextResponse.json({ message: 'User deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
