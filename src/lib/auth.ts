import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from './jwt';
import prisma from './prisma';

// SQLite does not support enum, using string type
type Role = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface AuthResult {
  userId: string;
  email: string;
  name: string;
}

export async function getAuthUser(req: NextRequest): Promise<AuthResult | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const payload = await verifyJWT(token);
  
  if (!payload) {
    return null;
  }

  return {
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
  };
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized access' },
    { status: 401 }
  );
}

export function forbiddenResponse() {
  return NextResponse.json(
    { error: 'Insufficient permissions' },
    { status: 403 }
  );
}

export interface ProjectAccessResult extends AuthResult {
  role: string;
  projectId: string;
}

export async function requireProjectAccess(
  req: NextRequest,
  projectId: string,
  minimumRole: Role = 'VIEWER'
): Promise<ProjectAccessResult | NextResponse> {
  const user = await getAuthUser(req);
  
  if (!user) {
    return unauthorizedResponse();
  }

  const membership = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId: user.userId,
        projectId,
      },
    },
  });

  if (!membership) {
    return forbiddenResponse();
  }

  const roleHierarchy: Record<string, number> = {
    VIEWER: 0,
    EDITOR: 1,
    OWNER: 2,
  };

  if (roleHierarchy[membership.role as string] < roleHierarchy[minimumRole]) {
    return forbiddenResponse();
  }

  return {
    ...user,
    role: membership.role,
    projectId,
  };
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

// Verify admin permissions
export async function requireAdmin(req: NextRequest): Promise<AuthResult | NextResponse> {
  const user = await getAuthUser(req);
  if (!user) {
    return unauthorizedResponse();
  }

  const userData = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { role: true },
  });

  if (!userData || userData.role !== 'ADMIN') {
    return forbiddenResponse();
  }

  return user;
}
