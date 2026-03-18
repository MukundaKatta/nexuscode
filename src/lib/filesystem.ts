import { FileNode } from "@/types";
import { getLanguageFromPath, sortFileTree } from "./utils";

const DEMO_FILES: Record<string, string> = {
  "src/index.ts": `import { App } from './app';
import { config } from './config';

const app = new App(config);
app.start().then(() => {
  console.log(\`Server running on port \${config.port}\`);
}).catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
`,
  "src/app.ts": `import express from 'express';
import cors from 'cors';
import { Config } from './config';
import { router } from './routes';
import { errorHandler } from './middleware/error';
import { logger } from './utils/logger';

export class App {
  private app: express.Application;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(logger.middleware());
  }

  private setupRoutes() {
    this.app.use('/api', router);
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.config.port, () => resolve());
    });
  }
}
`,
  "src/config.ts": `export interface Config {
  port: number;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  redis: {
    url: string;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000'),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'myapp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me',
    expiresIn: '7d',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
};
`,
  "src/routes/index.ts": `import { Router } from 'express';
import { userRoutes } from './users';
import { authRoutes } from './auth';
import { postRoutes } from './posts';

export const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
`,
  "src/routes/users.ts": `import { Router, Request, Response } from 'express';
import { UserService } from '../services/user';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateUserSchema } from '../schemas/user';

export const userRoutes = Router();
const userService = new UserService();

userRoutes.get('/', authenticate, async (req: Request, res: Response) => {
  const users = await userService.findAll();
  res.json(users);
});

userRoutes.get('/:id', authenticate, async (req: Request, res: Response) => {
  const user = await userService.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

userRoutes.put('/:id', authenticate, validate(updateUserSchema), async (req: Request, res: Response) => {
  const user = await userService.update(req.params.id, req.body);
  res.json(user);
});

userRoutes.delete('/:id', authenticate, async (req: Request, res: Response) => {
  await userService.delete(req.params.id);
  res.status(204).send();
});
`,
  "src/routes/auth.ts": `import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema } from '../schemas/auth';

export const authRoutes = Router();
const authService = new AuthService();

authRoutes.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

authRoutes.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: 'Registration failed' });
  }
});

authRoutes.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});
`,
  "src/routes/posts.ts": `import { Router, Request, Response } from 'express';
import { PostService } from '../services/post';
import { authenticate } from '../middleware/auth';

export const postRoutes = Router();
const postService = new PostService();

postRoutes.get('/', async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query;
  const posts = await postService.findAll(Number(page), Number(limit));
  res.json(posts);
});

postRoutes.post('/', authenticate, async (req: Request, res: Response) => {
  const post = await postService.create(req.body.userId, req.body);
  res.status(201).json(post);
});

postRoutes.get('/:id', async (req: Request, res: Response) => {
  const post = await postService.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});
`,
  "src/services/user.ts": `import { db } from '../database';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserService {
  async findAll(): Promise<User[]> {
    return db.query('SELECT id, email, name, avatar, created_at, updated_at FROM users ORDER BY created_at DESC');
  }

  async findById(id: string): Promise<User | null> {
    const users = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return users[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const users = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return users[0] || null;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const fields = Object.keys(data).map((k, i) => \`\${k} = $\${i + 2}\`).join(', ');
    const values = Object.values(data);
    const users = await db.query(
      \`UPDATE users SET \${fields}, updated_at = NOW() WHERE id = $1 RETURNING *\`,
      [id, ...values]
    );
    return users[0];
  }

  async delete(id: string): Promise<void> {
    await db.query('DELETE FROM users WHERE id = $1', [id]);
  }
}
`,
  "src/services/auth.ts": `import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserService } from './user';
import { db } from '../database';

const userService = new UserService();

export class AuthService {
  async login(email: string, password: string) {
    const user = await userService.findByEmail(email);
    if (!user) throw new Error('Invalid credentials');

    const passwordHash = await db.query('SELECT password_hash FROM users WHERE id = $1', [user.id]);
    const valid = await bcrypt.compare(password, passwordHash[0].password_hash);
    if (!valid) throw new Error('Invalid credentials');

    const token = this.generateToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    return { user, token, refreshToken };
  }

  async register(data: { email: string; password: string; name: string }) {
    const existing = await userService.findByEmail(data.email);
    if (existing) throw new Error('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const users = await db.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [data.email, passwordHash, data.name]
    );

    const user = users[0];
    const token = this.generateToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    return { user, token, refreshToken };
  }

  async refreshToken(token: string) {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as { userId: string; type: string };
      if (payload.type !== 'refresh') throw new Error('Invalid token type');

      const user = await userService.findById(payload.userId);
      if (!user) throw new Error('User not found');

      return {
        token: this.generateToken(user.id),
        refreshToken: this.generateRefreshToken(user.id),
      };
    } catch {
      throw new Error('Invalid refresh token');
    }
  }

  private generateToken(userId: string): string {
    return jwt.sign({ userId, type: 'access' }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign({ userId, type: 'refresh' }, config.jwt.secret, { expiresIn: '30d' });
  }
}
`,
  "src/middleware/auth.ts": `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    (req as any).userId = (payload as any).userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
`,
  "src/middleware/error.ts": `import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
`,
  "src/utils/logger.ts": `export const logger = {
  info: (message: string, ...args: any[]) => console.log(\`[INFO] \${message}\`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(\`[WARN] \${message}\`, ...args),
  error: (message: string, ...args: any[]) => console.error(\`[ERROR] \${message}\`, ...args),
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(\`[DEBUG] \${message}\`, ...args);
    }
  },
  middleware: () => (req: any, _res: any, next: any) => {
    console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.url}\`);
    next();
  },
};
`,
  "src/database/index.ts": `import { config } from '../config';

class Database {
  private pool: any = null;

  async connect() {
    // Connection pool simulation
    console.log(\`Connected to database \${config.database.name}\`);
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    console.log('Query:', sql, params);
    return [];
  }

  async disconnect() {
    console.log('Disconnected from database');
  }
}

export const db = new Database();
`,
  "package.json": `{
  "name": "demo-api",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "lint": "eslint src/"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21"
  }
}
`,
  "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
`,
  ".env.example": `PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_USER=postgres
DB_PASSWORD=secret
JWT_SECRET=your-secret-key
REDIS_URL=redis://localhost:6379
`,
};

function buildFileTree(files: Record<string, string>): FileNode[] {
  const root: FileNode[] = [];

  for (const filePath of Object.keys(files).sort()) {
    const parts = filePath.split("/");
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");

      const existing = currentLevel.find((n) => n.name === part);
      if (existing) {
        if (existing.children) {
          currentLevel = existing.children;
        }
      } else {
        const node: FileNode = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "directory",
          ...(isFile
            ? {
                content: files[filePath],
                language: getLanguageFromPath(filePath),
              }
            : { children: [], isOpen: true }),
        };
        currentLevel.push(node);
        if (!isFile && node.children) {
          currentLevel = node.children;
        }
      }
    }
  }

  return sortFileTree(root);
}

let projectFiles = { ...DEMO_FILES };
let fileTree: FileNode[] = buildFileTree(projectFiles);

export function getFileTree(): FileNode[] {
  return fileTree;
}

export function getFileContent(path: string): string | null {
  return projectFiles[path] ?? null;
}

export function setFileContent(path: string, content: string): void {
  projectFiles[path] = content;
  fileTree = buildFileTree(projectFiles);
}

export function createFile(path: string, content: string = ""): void {
  projectFiles[path] = content;
  fileTree = buildFileTree(projectFiles);
}

export function deleteFile(path: string): void {
  const toDelete = Object.keys(projectFiles).filter(
    (p) => p === path || p.startsWith(path + "/")
  );
  for (const p of toDelete) {
    delete projectFiles[p];
  }
  fileTree = buildFileTree(projectFiles);
}

export function renameFile(oldPath: string, newPath: string): void {
  const entries = Object.entries(projectFiles).filter(
    ([p]) => p === oldPath || p.startsWith(oldPath + "/")
  );
  for (const [p, content] of entries) {
    const newFilePath = p.replace(oldPath, newPath);
    projectFiles[newFilePath] = content;
    delete projectFiles[p];
  }
  fileTree = buildFileTree(projectFiles);
}

export function getAllFiles(): Record<string, string> {
  return { ...projectFiles };
}

export function getAllFilePaths(): string[] {
  return Object.keys(projectFiles);
}

export function searchFiles(query: string): Array<{ path: string; matches: Array<{ line: number; content: string }> }> {
  const results: Array<{ path: string; matches: Array<{ line: number; content: string }> }> = [];
  const lowerQuery = query.toLowerCase();

  for (const [path, content] of Object.entries(projectFiles)) {
    const lines = content.split("\n");
    const matches: Array<{ line: number; content: string }> = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(lowerQuery)) {
        matches.push({ line: i + 1, content: lines[i] });
      }
    }

    if (matches.length > 0) {
      results.push({ path, matches });
    }
  }

  return results;
}
