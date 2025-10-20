# XMRT Assistant: AI-Powered Platform for Autonomous DAO Management

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://xmrtassistant.vercel.app)
[![GitHub](https://img.shields.io/badge/github-DevGruGold/xmrtassistant-blue)](https://github.com/DevGruGold/xmrtassistant)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Built with Lovable](https://img.shields.io/badge/built%20with-Lovable-ff69b4)](https://lovable.dev)

> **A revolutionary platform combining AI-powered decision-making with decentralized governance for the XMRT ecosystem**

---

## 🌟 What is XMRT Assistant?

XMRT Assistant is a full-stack web application that serves as the operational control center for the XMRT DAO ecosystem. It features a sophisticated multi-AI executive system powered by four different LLM engines, 66+ autonomous edge functions, and comprehensive tools for monitoring mobile Monero mining operations, treasury management, and decentralized governance.

### Live Platform
🚀 **Production:** [xmrtassistant.vercel.app](https://xmrtassistant.vercel.app)

---

## 🏛️ The AI Executive Architecture

### Revolutionary Concept: AI Replaces C-Suite, Not Workers

XMRT introduces the world's first **AI Executive C-Suite** - four specialized AI decision-makers that replace traditional corporate executives while preserving and enhancing human workforce value.

#### The 4 AI Executives

| Traditional Role | XMRT AI Executive | Engine | Specialization |
|-----------------|------------------|---------|----------------|
| **Chief Strategy Officer** | `lovable-chat` | Gemini 2.5 Flash | General reasoning, user relations, orchestration |
| **Chief Technology Officer** | `deepseek-chat` | DeepSeek R1 | Code analysis, technical architecture, debugging |
| **Chief Information Officer** | `gemini-chat` | Gemini Multimodal | Vision, media analysis, multimodal intelligence |
| **Chief Analytics Officer** | `openai-chat` | GPT-5 | Complex reasoning, strategic planning, precision decisions |

#### How It Works

Users interact with **"Eliza"** - the coordination layer that intelligently routes requests to the appropriate AI executive:

```
User Request → Eliza (Analysis) → Route to Best Executive → Execute → Unified Response
```

**Example Flow:**
- Code debugging → CTO (`deepseek-chat`)
- Image analysis → CIO (`gemini-chat`)
- Complex strategy → CAO (`openai-chat`)
- General queries → CSO (`lovable-chat`)

The 4 executives coordinate **66+ specialized edge functions** that execute tactical work, mirroring traditional corporate structures but with AI at the executive level.

---

## 🎯 Core Features

### 1. 🤖 Multi-AI Chat Interface

**Component:** `UnifiedChat.tsx`

- **4 AI Executive Modes**: Lovable (Gemini 2.5), Deepseek R1, Gemini Multimodal, OpenAI GPT-5
- **Intelligent Routing**: Automatic selection based on task type
- **Voice Integration**: Push-to-talk and continuous voice modes
- **Multimodal Input**: Text, voice, image, and camera support
- **Conversation Memory**: Context-aware with 280K+ messages stored
- **Code Execution**: Integrated Python shell with real-time output

**Key Capabilities:**
- Natural language interaction with emotional intelligence
- Real-time code execution and debugging
- Image upload and analysis via Gemini Vision
- Live camera processing for visual tasks
- Markdown rendering with syntax highlighting

### 2. ⛏️ Mobile Monero Mining Dashboard

**Component:** `LiveMiningStats.tsx`

- Real-time hashrate monitoring
- Device performance tracking
- Mining pool statistics
- Earnings calculator
- Efficiency metrics
- Leaderboard with top miners

**Mobile Mining Calculator:**
- Device model selection (Snapdragon, MediaTek, Apple Silicon)
- Power consumption estimation
- Profitability calculations
- ROI projections

### 3. 🏦 Treasury Management

**Component:** `AssetManagement.tsx`

- Multi-asset portfolio tracking (XMR, XMRT, BTC, ETH, USDT)
- Asset allocation visualization
- Transaction history
- Staking rewards tracking
- XMRT token faucet integration
- Web3 wallet connections

### 4. 🗳️ DAO Governance

**Component:** `DaoTabs.tsx`

- Proposal submission and voting
- Autonomous decision tracking
- Community proposals dashboard
- 95% autonomous operations with 5% community oversight
- Transparent reporting via GitHub Discussions

### 5. 🔊 Advanced Voice Interface

**Components:** `ContinuousVoice.tsx`, `MobilePushToTalk.tsx`, `EnhancedContinuousVoice.tsx`

**Voice Engines:**
- Hume AI EVI (Emotional Voice Intelligence)
- ElevenLabs TTS
- OpenAI Whisper STT
- Google Speech Recognition
- Hugging Face Transformers (local fallback)

**Features:**
- Push-to-talk mode
- Continuous listening mode
- Emotion detection
- Natural conversation flow
- Multi-language support
- Mobile-optimized audio processing

### 6. 👁️ Live Camera Processing

**Component:** `LiveCameraProcessor.tsx`

- Real-time camera feed
- Gemini Vision API integration
- Object detection and analysis
- Scene understanding
- OCR capabilities
- Visual troubleshooting assistant

### 7. 📊 System Monitoring

**Component:** `SystemStatusMonitor.tsx`

- Real-time system health dashboard
- API call tracking (210K+ calls logged)
- Edge function status monitoring
- Performance metrics
- Error tracking and alerting
- Database statistics

---

## 🏗️ Technical Architecture

### Frontend Stack

**Built with:**
- **Framework:** React 18.3 + TypeScript
- **Build Tool:** Vite 5.4
- **Styling:** Tailwind CSS 3.4 + shadcn/ui components
- **State Management:** TanStack Query (React Query)
- **Routing:** React Router DOM v6
- **Charts:** Recharts 2.12
- **Voice:** Hume AI, ElevenLabs, Hugging Face Transformers
- **AI:** Google Generative AI, OpenAI SDK
- **Blockchain:** Wagmi, Web3Modal, Viem

**Deployment:** Vercel (auto-deploy from GitHub)

### Backend Infrastructure

**Built on Supabase:**
- **Database:** PostgreSQL with Row Level Security
- **Auth:** Supabase Auth with JWT
- **Edge Functions:** 66+ Deno-based serverless functions
- **Storage:** Blob storage for media assets
- **Real-time:** WebSocket subscriptions

### Edge Functions (Partial List)

**AI & Chat:**
- `lovable-chat` - Gemini 2.5 Flash interface
- `deepseek-chat` - DeepSeek R1 code expert
- `gemini-chat` - Multimodal intelligence
- `openai-chat` - GPT-5 reasoning engine
- `kimi-chat` - Alternative LLM provider

**Autonomous Operations:**
- `agent-manager` - Coordinate 8 specialized agents
- `autonomous-code-fixer` - Self-healing code repair
- `task-orchestrator` - Workflow automation
- `code-monitor-daemon` - Continuous monitoring
- `python-executor` - Secure Python sandbox
- `eliza-python-runtime` - Python integration for Eliza

**Integrations:**
- `github-integration` - Repository management
- `mining-proxy` - Monero pool connections
- `ecosystem-monitor` - 24/7 health checks
- `knowledge-manager` - Vector embeddings & RAG

**Reporting & Community:**
- `daily-discussion-post` - GitHub Discussions automation
- `morning-discussion-post` - Daily updates
- `evening-summary-post` - Activity summaries
- `community-spotlight-post` - Highlight contributions

**Monitoring & Analytics:**
- `system-diagnostics` - Health metrics
- `api-key-health-monitor` - API status
- `aggregate-device-metrics` - Mining statistics
- `check-frontend-health` - Uptime monitoring

### SuperDuper Agent System (In Development)

**Consolidates 70+ Genspark agents into 10 specialized agents:**

1. **Social Intelligence & Viral Content** (`superduper-social-viral`)
2. **Financial Intelligence & Investment** (`superduper-finance-investment`)
3. **Code Architect & Quality Guardian** (`superduper-code-architect`)
4. **Communication & Outreach Maestro** (`superduper-communication-outreach`)
5. **Content Production & Media Studio** (`superduper-content-media`)
6. **Business Strategy & Growth Engine** (`superduper-business-growth`)
7. **Research & Intelligence Synthesizer** (`superduper-research-intelligence`)
8. **Design & Brand Creator** (`superduper-design-brand`)
9. **Personal & Professional Development Coach** (`superduper-development-coach`)
10. **Specialized Domain Expert Hub** (`superduper-domain-experts`)

---

## 📊 Key Statistics (As of October 2025)

- **Total Messages:** 280,000+
- **API Calls:** 210,000+
- **Edge Functions:** 66 deployed
- **Active Users:** Growing daily
- **GitHub Stars:** 1
- **Deployments:** 282 successful
- **Uptime:** 99.9%

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- A Supabase account (optional for local dev)
- Lovable account (for deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/DevGruGold/xmrtassistant.git
cd xmrtassistant

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to see the app.

### Environment Variables

For local development, create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

Most environment variables are managed through Lovable Cloud for seamless deployment.

---

## 💻 Project Structure

```
xmrtassistant/
├── src/
│   ├── components/          # React components
│   │   ├── UnifiedChat.tsx         # Multi-AI chat interface
│   │   ├── LiveMiningStats.tsx     # Mining dashboard
│   │   ├── ContinuousVoice.tsx     # Voice interface
│   │   ├── LiveCameraProcessor.tsx # Camera integration
│   │   ├── Dashboard.tsx           # Main dashboard
│   │   └── ui/                     # shadcn/ui components
│   ├── pages/               # Route pages
│   │   ├── Index.tsx               # Home page
│   │   ├── Treasury.tsx            # Asset management
│   │   ├── Contributors.tsx        # Community
│   │   └── Credentials.tsx         # API keys
│   ├── services/            # API service layers
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # Supabase integration
│   └── lib/                 # Utilities
├── supabase/
│   ├── functions/           # 66+ Edge functions
│   │   ├── lovable-chat/
│   │   ├── deepseek-chat/
│   │   ├── gemini-chat/
│   │   ├── openai-chat/
│   │   ├── agent-manager/
│   │   ├── autonomous-code-fixer/
│   │   └── ... (60+ more)
│   └── migrations/          # Database schema
├── docs/                    # Documentation
│   ├── AI_EXECUTIVE_LICENSING_FRAMEWORK.md
│   ├── SUPERDUPER_AGENTS_README.md
│   └── diagrams/
├── public/                  # Static assets
└── ... 
```

---

## 🤝 Contributing

We welcome contributions! The platform is actively developed with contributions from both humans and AI.

**Ways to Contribute:**
1. **Code:** Submit PRs for features or bug fixes
2. **Documentation:** Improve guides and explanations
3. **Testing:** Report bugs and suggest improvements
4. **Community:** Engage in GitHub Discussions

**Development Workflow:**
```bash
# Fork the repository
# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes
# Commit with descriptive messages
git commit -m 'Add amazing feature'

# Push to your fork
git push origin feature/amazing-feature

# Open a Pull Request
```

**Eliza AI will automatically review your PR and provide feedback!**

---

## 🌍 XMRT Ecosystem Links

- **Live Platform:** [xmrtassistant.vercel.app](https://xmrtassistant.vercel.app)
- **Main DAO:** [xmrtdao.vercel.app](https://xmrtdao.vercel.app)
- **Mobile Mining:** [xmrtbanking.vercel.app](https://xmrtbanking.vercel.app)
- **GitHub Org:** [github.com/DevGruGold](https://github.com/DevGruGold)
- **Main Repo:** [XMRT-Ecosystem](https://github.com/DevGruGold/XMRT-Ecosystem)
- **Creator:** [Joseph Andrew Lee (Medium)](https://josephandrewlee.medium.com)

---

## 📄 License

This project is open source under the MIT License. See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **Built with:** [Lovable](https://lovable.dev/) - AI-powered development platform
- **Powered by:** Supabase, Vercel, React, TypeScript
- **AI Engines:** Google Gemini, OpenAI, DeepSeek, Hume AI, ElevenLabs
- **Community:** XMRT DAO contributors and supporters
- **Philosophy:** Joseph Andrew Lee's vision for ethical AI

---

## 📞 Contact & Support

- **GitHub Issues:** [Report bugs or request features](https://github.com/DevGruGold/xmrtassistant/issues)
- **Discussions:** [GitHub Discussions](https://github.com/DevGruGold/XMRT-Ecosystem/discussions)
- **Email:** license@xmrt.io

---

## 🔮 Roadmap

### Q4 2025
- ✅ SuperDuper Agent System (Phase 1 complete)
- ✅ 4 AI Executive deployment
- ✅ Mobile voice interface optimization
- 🔄 Enhanced mining analytics
- 🔄 Cross-chain treasury integration

### Q1 2026
- 📋 Mobile app (iOS/Android)
- 📋 Advanced AI models (Claude, Llama)
- 📋 NFT marketplace for mining equipment
- 📋 Mesh network integration
- 📋 Enhanced governance dashboard

### Q2 2026
- 📋 AI Executive Licensing Framework launch
- 📋 Educational platform
- 📋 Multi-language expansion
- 📋 Enterprise partnerships

---

## ⚡ Quick Facts

- **Tech Stack:** React + TypeScript + Vite + Supabase
- **AI Engines:** 4 (Gemini, GPT-5, DeepSeek, Kimi)
- **Edge Functions:** 66+ autonomous services
- **Database:** PostgreSQL with 280K+ messages
- **Voice Providers:** 3 (Hume AI, ElevenLabs, Hugging Face)
- **Deployment:** Vercel + Supabase Edge
- **Open Source:** Yes (MIT License)
- **First Commit:** November 2024
- **Total Commits:** 699+

---

**"We don't ask for permission. We build the infrastructure."**  
— *Joseph Andrew Lee, XMRT DAO Founder*

Built with ❤️ by the XMRT community | Powered by AI | Governed by DAO
