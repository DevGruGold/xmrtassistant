# Contributing to XMRT Assistant

Thank you for your interest in contributing to XMRT Assistant! This document provides guidelines and information for contributors.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/DevGruGold/xmrtassistant.git
   cd xmrtassistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Code Quality

We maintain high code quality standards:

- **Linting**: Run `npm run lint` to check for issues
- **Formatting**: Run `npm run format` to format code
- **Type Checking**: Run `npm run type-check` to verify types
- **Pre-commit Hooks**: Automatically run checks before commits

## Commit Message Format

We follow conventional commits:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation updates
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/updates
- `chore:` Maintenance tasks

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all checks pass
4. Submit a pull request with clear description
5. Address any review feedback

## AI Integration Guidelines

When working with AI features:

- Maintain context awareness
- Implement proper error handling
- Consider rate limiting and costs
- Test with various inputs
- Document API usage patterns

## Questions?

Feel free to open an issue for any questions or suggestions!
