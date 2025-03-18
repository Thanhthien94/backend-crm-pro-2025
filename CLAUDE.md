# CRM Backend Reference

## Build & Test Commands
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production code
- `npm run start` - Run production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run all tests
- `npm test -- -t "test name"` - Run specific test
- `npm run seed` - Seed database with initial data

## Code Style Guidelines
- **TypeScript**: Use strict typing, avoid `any` when possible
- **Imports**: Group imports (node modules, local modules)
- **Formatting**: 2 spaces indentation, 100 chars line length, single quotes
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces
- **Error Handling**: Use try/catch with custom error classes
- **Controllers**: Follow RESTful patterns, use async/await
- **Models**: Define clear interfaces/types for all schemas
- **Architecture**: Follow MVC pattern - keep business logic in services
- **Comments**: JSDoc for public APIs and complex functions