import { ProjectRole } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { ApiError } from '../http/api-handler.js';

export const loadProjectAccess = async (projectId: string, userId: string, userEmail: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project) {
    throw new ApiError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }

  const isOwner = project.ownerUserId === userId;
  if (isOwner) {
    return {
      project,
      role: ProjectRole.OWNER,
      permission: 'MANAGE',
      isOwner: true,
    };
  }

  const member = await prisma.projectMember.findFirst({
    where: {
      projectId,
      status: 'ACTIVE',
      OR: [{ userId }, { email: userEmail.toLowerCase() }],
    },
  });

  if (!member) {
    throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  }

  return {
    project,
    role: member.role,
    permission: member.permissionLevel,
    isOwner: false,
  };
};

export const requireProjectView = async (projectId: string, userId: string, userEmail: string) =>
  loadProjectAccess(projectId, userId, userEmail);

export const requireProjectEdit = async (projectId: string, userId: string, userEmail: string) => {
  const access = await loadProjectAccess(projectId, userId, userEmail);
  if (access.role === ProjectRole.VIEWER) {
    throw new ApiError(403, 'Viewer cannot edit this project', 'FORBIDDEN');
  }
  return access;
};

export const requireProjectOwner = async (projectId: string, userId: string, userEmail: string) => {
  const access = await loadProjectAccess(projectId, userId, userEmail);
  if (!access.isOwner) {
    throw new ApiError(403, 'Only owner can perform this action', 'FORBIDDEN');
  }
  return access;
};

