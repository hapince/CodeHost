import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth';

// Purchase project
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) return unauthorizedResponse();

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, slug: true, price: true, isPrivate: true, ownerId: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project does not exist' }, { status: 404 });
    }

    if (project.isPrivate) {
      return NextResponse.json({ error: 'Private projects cannot be purchased' }, { status: 400 });
    }

    if (project.ownerId === user.userId) {
      return NextResponse.json({ error: 'Cannot purchase your own project' }, { status: 400 });
    }

    if (project.price <= 0) {
      return NextResponse.json({ error: 'This is a free project, no purchase needed' }, { status: 400 });
    }

    // Check if already purchased
    const existing = await prisma.purchase.findUnique({
      where: { buyerId_projectId: { buyerId: user.userId, projectId: params.id } },
    });

    if (existing) {
      return NextResponse.json({ error: 'You have already purchased this project' }, { status: 400 });
    }

    // Check balance
    const buyer = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { balance: true },
    });

    if (!buyer || buyer.balance < project.price) {
      return NextResponse.json({ error: 'Insufficient balance, please top up first' }, { status: 400 });
    }

    // Execute transaction: deduct buyer balance, increase project owner balance, create purchase record
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.userId },
        data: { balance: { decrement: project.price } },
      }),
      prisma.user.update({
        where: { id: project.ownerId },
        data: { balance: { increment: project.price } },
      }),
      prisma.purchase.create({
        data: {
          amount: project.price,
          buyerId: user.userId,
          projectId: params.id,
        },
      }),
    ]);

    // Send notifications to buyer and seller
    await prisma.notification.createMany({
      data: [
        {
          type: 'ORDER_BOUGHT',
          title: 'Purchase successful',
          content: `You have successfully purchased project "${project.name}", cost $${project.price.toFixed(2)}`,
          userId: user.userId,
          link: `/explore/${project.slug}`,
        },
        {
          type: 'ORDER_SOLD',
          title: 'Project purchased',
          content: `Your project "${project.name}" was purchased, revenue $${project.price.toFixed(2)}`,
          userId: project.ownerId,
          link: `/project/${project.slug}`,
        },
      ],
    });

    return NextResponse.json({ message: 'Purchase successful', projectName: project.name });
  } catch (error) {
    console.error('Purchase project error:', error);
    return NextResponse.json({ error: 'Purchase failed' }, { status: 500 });
  }
}

// Check if already purchased
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ purchased: false });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { buyerId_projectId: { buyerId: user.userId, projectId: params.id } },
    });

    return NextResponse.json({ purchased: !!purchase });
  } catch (error) {
    return NextResponse.json({ purchased: false });
  }
}
