import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Store active connections
interface UserCursor {
  position: { line: number; column: number };
  color: string;
}

interface UserInfo {
  id: string;
  name: string;
  avatar?: string;
}

// Project rooms: projectId -> Set<userId>
const projectRooms = new Map<string, Map<string, UserInfo>>();

// File editors: fileId -> Map<userId, cursor>
const fileEditors = new Map<string, Map<string, UserCursor & UserInfo>>();

// User color pool
const cursorColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

function getRandomColor(): string {
  return cursorColors[Math.floor(Math.random() * cursorColors.length)];
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  let currentUserId: string;
  let currentUserName: string;
  let currentProjectId: string;
  let currentFileId: string | null = null;
  let userColor: string = getRandomColor();

  // Join project
  socket.on('join-project', ({ projectId, userId, userName, avatar }) => {
    currentUserId = userId;
    currentUserName = userName;
    currentProjectId = projectId;

    socket.join(`project:${projectId}`);

    if (!projectRooms.has(projectId)) {
      projectRooms.set(projectId, new Map());
    }
    
    const userInfo: UserInfo = { id: userId, name: userName, avatar };
    projectRooms.get(projectId)!.set(userId, userInfo);

    // Notify other users
    socket.to(`project:${projectId}`).emit('user-joined', {
      userId,
      userName,
      avatar,
    });

    // Send current online user list
    const onlineUsers = Array.from(projectRooms.get(projectId)!.values());
    socket.emit('online-users', onlineUsers);

    console.log(`User ${userName} joined project ${projectId}`);
  });

  // Leave project
  socket.on('leave-project', ({ projectId, userId }) => {
    socket.leave(`project:${projectId}`);
    
    const room = projectRooms.get(projectId);
    if (room) {
      room.delete(userId);
      if (room.size === 0) {
        projectRooms.delete(projectId);
      }
    }

    socket.to(`project:${projectId}`).emit('user-left', { userId });
    console.log(`User ${userId} left project ${projectId}`);
  });

  // Open file
  socket.on('open-file', ({ fileId, userId }) => {
    currentFileId = fileId;
    socket.join(`file:${fileId}`);

    if (!fileEditors.has(fileId)) {
      fileEditors.set(fileId, new Map());
    }

    fileEditors.get(fileId)!.set(userId, {
      id: userId,
      name: currentUserName,
      position: { line: 1, column: 1 },
      color: userColor,
    });

    // Send all cursor positions for current file
    const cursors = Array.from(fileEditors.get(fileId)!.entries()).map(
      ([uid, data]) => ({
        userId: uid,
        userName: data.name,
        position: data.position,
        color: data.color,
      })
    );
    socket.emit('file-cursors', cursors);

    // Notify other users
    socket.to(`file:${fileId}`).emit('user-opened-file', {
      userId,
      userName: currentUserName,
      color: userColor,
    });

    console.log(`User ${userId} opened file ${fileId}`);
  });

  // Close file
  socket.on('close-file', ({ fileId, userId }) => {
    socket.leave(`file:${fileId}`);
    
    const editors = fileEditors.get(fileId);
    if (editors) {
      editors.delete(userId);
      if (editors.size === 0) {
        fileEditors.delete(fileId);
      }
    }

    socket.to(`file:${fileId}`).emit('user-closed-file', { userId });
    currentFileId = null;
    console.log(`User ${userId} closed file ${fileId}`);
  });

  // Edit file
  socket.on('edit-file', ({ fileId, userId, changes, cursorPosition }) => {
    // Update cursor position
    const editors = fileEditors.get(fileId);
    if (editors && editors.has(userId)) {
      editors.get(userId)!.position = cursorPosition;
    }

    // Broadcast to other users
    socket.to(`file:${fileId}`).emit('file-updated', {
      fileId,
      changes,
      userId,
      cursorPosition,
    });
  });

  // Cursor move
  socket.on('cursor-move', ({ fileId, userId, position }) => {
    const editors = fileEditors.get(fileId);
    if (editors && editors.has(userId)) {
      editors.get(userId)!.position = position;
    }

    socket.to(`file:${fileId}`).emit('cursor-updated', {
      fileId,
      userId,
      position,
      color: userColor,
    });
  });

  // Text selection
  socket.on('selection-change', ({ fileId, userId, selection }) => {
    socket.to(`file:${fileId}`).emit('selection-updated', {
      fileId,
      userId,
      selection,
      color: userColor,
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Clean up project rooms
    if (currentProjectId && currentUserId) {
      const room = projectRooms.get(currentProjectId);
      if (room) {
        room.delete(currentUserId);
        if (room.size === 0) {
          projectRooms.delete(currentProjectId);
        }
      }
      
      socket.to(`project:${currentProjectId}`).emit('user-left', {
        userId: currentUserId,
      });
    }

    // Clean up file editors
    if (currentFileId && currentUserId) {
      const editors = fileEditors.get(currentFileId);
      if (editors) {
        editors.delete(currentUserId);
        if (editors.size === 0) {
          fileEditors.delete(currentFileId);
        }
      }
      
      socket.to(`file:${currentFileId}`).emit('user-closed-file', {
        userId: currentUserId,
      });
    }
  });
});

const PORT = process.env.WS_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 WebSocket server running on http://localhost:${PORT}`);
});

export { io, httpServer };
