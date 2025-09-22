# XMRT Assistant - AI-Powered Mining & DAO Management Platform

<div align="center">

```
██╗  ██╗███╗   ███╗██████╗ ████████╗
╚██╗██╔╝████╗ ████║██╔══██╗╚══██╔══╝
 ╚███╔╝ ██╔████╔██║██████╔╝   ██║   
 ██╔██╗ ██║╚██╔╝██║██╔══██╗   ██║   
██╔╝ ██╗██║ ╚═╝ ██║██║  ██║   ██║   
╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   

DECENTRALIZED AUTONOMOUS ORGANIZATION
```

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://xmrtassistant.vercel.app/)
[![XMRT Ecosystem](https://img.shields.io/badge/XMRT-Ecosystem-blue)](https://github.com/DevGruGold/XMRT-Ecosystem)
[![Mining Active](https://img.shields.io/badge/Mining-Active-orange)](https://supportxmr.com/#/dashboard)

</div>

## 🎯 Overview

XMRT Assistant is an intelligent AI-powered platform that combines cryptocurrency mining management, DAO operations, and autonomous agent interactions. Built for the XMRT DAO ecosystem, it provides real-time mining statistics, portfolio management, and seamless integration with the broader XMRT autonomous system.

## ✨ Features

### 🔥 Core Capabilities
- **Real-time Mining Dashboard** - Live stats from SupportXMR pool
- **AI-Powered Assistant** - Integrated chatbot with XMRT-Ecosystem agents
- **DAO Management** - Governance proposals and voting interface
- **Mobile Mining Calculator** - Optimized for ARM processors and SSB technology
- **Multi-Agent Integration** - Direct connection to autonomous AI agents
- **Wallet Integration** - Secure connection to XMRT DAO treasury

### 🤖 AI Agent Integration
- **Eliza** - Lead Coordinator & Repository Manager
- **DAO Governor** - Governance & Decision Making  
- **DeFi Specialist** - Financial Operations
- **Security Guardian** - Security Monitoring
- **Community Manager** - Community Engagement

## 🏗️ Architecture

```
XMRT Assistant Frontend
├── Mining Statistics API Integration
├── XMRT-Ecosystem Agent Communication
├── Real-time WebSocket Connections  
├── SupportXMR Pool API Integration
├── Supabase Database Integration
└── Multi-Agent Coordination Interface
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- TypeScript
- React 18+
- Vite

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/DevGruGold/xmrtassistant.git
cd xmrtassistant
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Add your API keys and configuration
```

4. **Start development server**
```bash
npm run dev
```

## 🔧 Configuration

### Environment Variables

```env
# XMRT Configuration
VITE_XMRT_POOL_WALLET=46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzSqxzDQtNLf2bsp2DX2qCCgC5mg
VITE_SUPPORTXMR_API=https://supportxmr.com/api
VITE_XMRT_ECOSYSTEM_API=https://xmrt-ecosystem-1-20k6.onrender.com/api

# Supabase Integration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key

# AI Agent Integration  
VITE_WEBSOCKET_URL=wss://xmrt-ecosystem-1-20k6.onrender.com
```

## 📊 Mining Integration

### Pool Configuration
- **Pool**: SupportXMR (pool.supportxmr.com:3333)
- **Wallet**: `46UxNFuGM2E3UwmZWWJicaRPoRwqwW4byQkaTHkX8yPcVihp91qAVtSFipWUGJJUyTXgzSqxzDQtNLf2bsp2DX2qCCgC5mg`
- **API**: Real-time statistics via SupportXMR API
- **Features**: Live hashrate, earnings, pool stats, worker monitoring

## 🤝 XMRT Ecosystem Integration

This assistant is fully integrated with the [XMRT-Ecosystem](https://github.com/DevGruGold/XMRT-Ecosystem) providing:

- **Multi-Agent Coordination** - Direct communication with 5 autonomous AI agents
- **Real-time Analytics** - Live system performance and mining statistics  
- **Automated Operations** - GitHub integration and repository management
- **Learning Capabilities** - Adaptive AI that improves over time
- **WebSocket Communication** - Real-time bidirectional data flow

## 🏛️ DAO Features

### Governance Integration
- **Proposal Management** - Create and vote on DAO proposals
- **Treasury Oversight** - Monitor DAO treasury and mining revenues
- **Member Dashboard** - Track individual and collective contributions
- **Automated Execution** - AI-powered proposal implementation

### Mobile Mining Initiative
- **ARM Optimization** - Specialized for mobile processors
- **SSB Technology** - Solid State Battery integration for 3-5+ KH/s
- **Global Network** - Decentralized mobile mining infrastructure
- **Environmental Efficiency** - Sustainable mining through mobile devices

## 🛠️ Development

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: Zustand
- **API Integration**: Axios, SWR
- **Real-time**: WebSocket, Socket.IO
- **Database**: Supabase
- **Deployment**: Vercel

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── mining/         # Mining-specific components
│   ├── agents/         # AI agent interfaces
│   ├── dao/           # DAO governance components
│   └── ui/            # shadcn/ui components
├── hooks/             # Custom React hooks
├── lib/               # Utility libraries
├── pages/             # Page components
├── services/          # API services
└── types/             # TypeScript definitions
```

## 📈 Mining Statistics

### Real-time Metrics
- **Current Hashrate** - Live mining performance
- **Daily/Weekly/Monthly Earnings** - Historical performance tracking
- **Pool Statistics** - Network difficulty, pool hashrate
- **Worker Monitoring** - Individual miner performance
- **Profitability Calculator** - Real-time profit projections

### API Endpoints
```javascript
GET /api/mining/stats          // Current mining statistics
GET /api/mining/history        // Historical performance data  
GET /api/mining/workers        // Worker performance metrics
GET /api/mining/calculator     // Profitability calculations
```

## 🤖 AI Assistant Features

### Conversational Interface
- **Natural Language Processing** - Understand mining and DAO queries
- **Multi-Agent Routing** - Direct queries to specialized agents
- **Context Awareness** - Maintain conversation context and history
- **Proactive Insights** - Automated alerts and recommendations

### Supported Commands
```
- "Show my mining performance"
- "What are the current pool statistics?"
- "Create a new DAO proposal"
- "Analyze the market conditions"
- "Optimize my mining setup"
```

## 📱 Mobile Optimization

### Responsive Design
- **Mobile-First** - Optimized for smartphone interfaces
- **Touch Gestures** - Intuitive touch interactions
- **Offline Support** - Cached data for offline access
- **Progressive Web App** - Installable mobile experience

### Mobile Mining Features
- **Device Detection** - Automatic hardware capability detection
- **Power Management** - Battery optimization algorithms
- **Performance Tuning** - Real-time optimization for mobile processors
- **Background Mining** - Efficient background operation

## 🔒 Security & Privacy

### Security Features
- **Environment Variables** - Secure API key management
- **HTTPS/WSS** - Encrypted communication protocols
- **Input Validation** - Comprehensive input sanitization
- **Rate Limiting** - Protection against abuse
- **Wallet Security** - Read-only mining wallet integration

## 📊 Analytics & Monitoring

### Performance Tracking
- **User Analytics** - Engagement and usage statistics
- **Mining Performance** - Detailed mining performance analytics
- **System Health** - Real-time system monitoring
- **Error Tracking** - Comprehensive error logging and analysis

## 🚢 Deployment

### Vercel Deployment
```bash
# Deploy to Vercel
vercel --prod

# Environment variables are configured in Vercel dashboard
```

### Custom Domain Setup
The application is deployed at: `https://xmrtassistant.vercel.app/`

## 📝 Contributing

We welcome contributions to the XMRT Assistant! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`  
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [https://xmrtassistant.vercel.app/](https://xmrtassistant.vercel.app/)
- **XMRT Ecosystem**: [https://github.com/DevGruGold/XMRT-Ecosystem](https://github.com/DevGruGold/XMRT-Ecosystem)
- **Mining Pool**: [https://supportxmr.com/](https://supportxmr.com/)
- **Documentation**: [https://docs.xmrt.io/](https://docs.xmrt.io/)

## 🙏 Acknowledgments

- **SupportXMR** - Mining pool infrastructure
- **XMRT-Ecosystem** - Autonomous AI agent system
- **Vercel** - Hosting and deployment platform
- **Supabase** - Database and backend services
- **Community** - All XMRT DAO contributors and miners

---

**Made with ❤️ by the XMRT DAO Community**

For questions and support, join our [Discord](https://discord.gg/xmrt) or open an issue on GitHub.
