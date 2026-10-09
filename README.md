# CodeLab — AI-Powered Code Analysis & Issue Prioritization Platform

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB running locally on port 27017
- (Optional) OpenAI API key for AI features
- (Optional) Judge0 API key for real code execution

### 1. Start MongoDB
```bash
mongod
```

### 2. Configure Backend
Edit `codelab-backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/codelab
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-your-openai-key-here   # Required for AI features
JUDGE0_API_KEY=your-judge0-key            # Optional, for real code execution
```

### 3. Start Backend
```bash
cd codelab-backend
npm start
```

### 4. Start Frontend
```bash
cd codelab-frontend
npm run dev
```

### 5. Open Application
Navigate to: **http://localhost:3000**

---

## 🎯 Features

| Feature | Description |
|---|---|
| **Authentication** | JWT + bcrypt, register/login, protected routes |
| **Code Editor** | Monaco editor with syntax highlighting for 15+ languages |
| **File Explorer** | Create, rename, delete, upload files |
| **Auto-save** | 2-second debounce auto-save with manual save button |
| **Compiler** | Sandboxed execution via Judge0 (mock fallback available) |
| **Static Analysis** | Pattern-based detection of security, bugs, code smells |
| **AI Analysis** | OpenAI GPT-4o mini enriches issues with explanations |
| **Issue Prioritization** | Critical / High / Medium / Low with scoring |
| **Hint Mode** | AI provides hints without giving away the solution |
| **Auto Repair** | AI generates diff, user reviews, accepts or rejects |
| **Dashboard** | Charts: pie, bar, line, area — recharts |
| **Admin Panel** | User management, activity logs, platform stats |

## 📁 Project Structure

```
CodeIQ/
├── codelab-backend/
│   ├── src/
│   │   ├── models/         # MongoDB schemas
│   │   ├── routes/         # Express API routes
│   │   ├── middleware/      # JWT auth middleware
│   │   ├── services/        # OpenAI, static analyzer, compiler
│   │   └── utils/           # Language detection, activity logger
│   ├── server.js
│   └── .env
└── codelab-frontend/
    ├── src/
    │   ├── pages/           # All page components
    │   ├── components/      # Reusable components
    │   ├── contexts/        # React Context (Auth, Project)
    │   └── lib/             # Axios API client
    └── vite.config.js
```

## 🔑 API Keys

### OpenAI (for AI features)
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add to `codelab-backend/.env`: `OPENAI_API_KEY=sk-...`

### Judge0 (for real code execution)
1. Sign up at https://rapidapi.com/judge0-official/api/judge0-ce
2. Add to `codelab-backend/.env`: `JUDGE0_API_KEY=your-key`

Without these keys, the app works with mock modes.

## 🔐 First User = Admin
The first user to register automatically gets admin privileges.

## 🛠 Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Monaco Editor, Recharts
- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Auth**: JWT, bcryptjs
- **AI**: OpenAI JS SDK (gpt-4o-mini)
- **Compiler**: Judge0 API
