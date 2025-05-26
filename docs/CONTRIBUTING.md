# Contributing Guide

## Welcome Contributors!

Thank you for your interest in contributing to the Next.js Data Platform! This guide will help you get started with contributing to the project.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Coding Standards](#coding-standards)
5. [Submitting Changes](#submitting-changes)
6. [Testing Guidelines](#testing-guidelines)
7. [Documentation](#documentation)

## Getting Started

### Prerequisites

- Node.js 18.0 or higher
- npm 9.0 or yarn 1.22+
- Git
- Modern web browser

### Development Setup

1. **Fork and Clone**
   \`\`\`bash
   git clone https://github.com/your-username/nextjs-data-platform.git
   cd nextjs-data-platform
   \`\`\`

2. **Install Dependencies**
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

3. **Environment Setup**
   \`\`\`bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   \`\`\`

4. **Start Development Server**
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

5. **Verify Installation**
   - Open http://localhost:3000
   - Upload a sample CSV file
   - Create a basic visualization

## Project Structure

\`\`\`
├── app/                    # Next.js App Router pages
├── components/             # React components
│   ├── ui/                # Base UI components (shadcn/ui)
│   ├── data-*.tsx         # Data-related components
│   ├── ml-*.tsx          # ML-related components
│   └── dashboard-*.tsx    # Dashboard components
├── lib/                   # Utility libraries and contexts
├── docs/                  # Documentation files
├── public/               # Static assets
└── tests/                # Test files
\`\`\`

## Coding Standards

### TypeScript Guidelines

- Use strict TypeScript configuration
- Define interfaces for all data structures
- Avoid `any` type - use proper typing
- Use meaningful variable and function names

\`\`\`typescript
// Good
interface ChartConfiguration {
  type: ChartType
  xAxis: string
  yAxis: string
  colorPalette: ColorPalette
}

// Avoid
const config: any = { ... }
\`\`\`

### React Best Practices

- Use functional components with hooks
- Implement proper error boundaries
- Use React.memo for performance optimization
- Follow the single responsibility principle

\`\`\`typescript
// Good - Single responsibility
const ChartRenderer = React.memo(({ config, data }: ChartRendererProps) => {
  // Chart rendering logic only
})

const ChartControls = ({ onConfigChange }: ChartControlsProps) => {
  // Control logic only
})
\`\`\`

### CSS and Styling

- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing and typography
- Use CSS variables for theme customization

\`\`\`typescript
// Good - Responsive and accessible
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
  <Card className="hover:shadow-lg transition-shadow">
    {/* Content */}
  </Card>
</div>
\`\`\`

### File Naming Conventions

- Components: `PascalCase.tsx` (e.g., `DataVisualizer.tsx`)
- Utilities: `kebab-case.ts` (e.g., `data-validation.ts`)
- Pages: `kebab-case.tsx` (e.g., `dashboard-creator.tsx`)
- Types: `PascalCase.ts` (e.g., `ChartTypes.ts`)

## Submitting Changes

### Branch Naming

- Feature: `feature/description` (e.g., `feature/add-histogram-chart`)
- Bug fix: `fix/description` (e.g., `fix/csv-parsing-error`)
- Documentation: `docs/description` (e.g., `docs/update-api-reference`)

### Commit Messages

Follow conventional commit format:

\`\`\`
type(scope): description

[optional body]

[optional footer]
\`\`\`

Examples:
\`\`\`
feat(visualization): add histogram chart type

- Implement histogram chart component
- Add data binning functionality
- Update chart type selector

Closes #123
\`\`\`

\`\`\`
fix(data): resolve CSV parsing issue with special characters

The CSV parser now properly handles files with special characters
and different encodings.

Fixes #456
\`\`\`

### Pull Request Process

1. **Create Feature Branch**
   \`\`\`bash
   git checkout -b feature/your-feature-name
   \`\`\`

2. **Make Changes**
   - Write clean, documented code
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   \`\`\`bash
   npm run test
   npm run lint
   npm run type-check
   \`\`\`

4. **Commit Changes**
   \`\`\`bash
   git add .
   git commit -m "feat(scope): your descriptive message"
   \`\`\`

5. **Push and Create PR**
   \`\`\`bash
   git push origin feature/your-feature-name
   \`\`\`

6. **PR Requirements**
   - Clear description of changes
   - Link to related issues
   - Screenshots for UI changes
   - Test coverage for new features

## Testing Guidelines

### Unit Tests

Write tests for:
- Utility functions
- Data processing logic
- Component behavior
- ML algorithm accuracy

\`\`\`typescript
// Example test
describe('DataProcessor', () => {
  it('should correctly detect column types', () => {
    const data = [
      { name: 'John', age: 25, salary: 50000.5 },
      { name: 'Jane', age: 30, salary: 60000.0 }
    ]
    
    const types = detectColumnTypes(data)
    
    expect(types.name).toBe('string')
    expect(types.age).toBe('number')
    expect(types.salary).toBe('number')
  })
})
\`\`\`

### Integration Tests

Test component interactions:
- File upload and processing
- Chart creation workflow
- Data preprocessing pipeline

### Performance Tests

Monitor:
- Large file processing time
- Chart rendering performance
- Memory usage patterns

## Documentation

### Code Documentation

- Use JSDoc for function documentation
- Include examples in complex functions
- Document component props with TypeScript interfaces

\`\`\`typescript
/**
 * Processes uploaded files and extracts data
 * @param file - The uploaded file (CSV, Excel, or JSON)
 * @param options - Processing options
 * @returns Promise resolving to processed data
 * @throws Error if file format is unsupported
 * 
 * @example
 * \`\`\`typescript
 * const data = await processFile(csvFile, { 
 *   detectTypes: true,
 *   skipEmptyLines: true 
 * })
 * ```
 */
async function processFile(
  file: File, 
  options: ProcessingOptions
): Promise<DataRow[]>
\`\`\`

### Component Documentation

Document component usage:

\`\`\`typescript
interface DataVisualizerProps {
  /** Initial chart configuration */
  initialConfig?: ChartConfig
  /** Callback when chart is exported */
  onExport?: (format: ExportFormat) => void
  /** Enable/disable real-time updates */
  autoUpdate?: boolean
}

/**
 * DataVisualizer - Interactive chart creation component
 * 
 * Provides a comprehensive interface for creating and customizing
 * various chart types with real-time preview and export capabilities.
 * 
 * @example
 * \`\`\`tsx
 * <DataVisualizer 
 *   initialConfig={{ type: 'bar', xAxis: 'category' }}
 *   onExport={(format) => console.log(`Exported as ${format}`)}
 *   autoUpdate={true}
 * />
 * ```
 */
export const DataVisualizer: React.FC<DataVisualizerProps>
\`\`\`

### README Updates

When adding new features:
- Update feature list
- Add usage examples
- Update screenshots if UI changes
- Document new dependencies

## Component Development Guidelines

### Creating New Components

1. **Component Structure**
   \`\`\`typescript
   // components/new-component.tsx
   import { useState, useEffect } from 'react'
   import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
   
   interface NewComponentProps {
     // Define props with proper types
   }
   
   export function NewComponent({ ...props }: NewComponentProps) {
     // Component logic
     return (
       // JSX with proper accessibility
     )
   }
   \`\`\`

2. **Add to Index**
   \`\`\`typescript
   // components/index.ts
   export { NewComponent } from './new-component'
   \`\`\`

3. **Create Tests**
   \`\`\`typescript
   // tests/components/new-component.test.tsx
   import { render, screen } from '@testing-library/react'
   import { NewComponent } from '@/components/new-component'
   
   describe('NewComponent', () => {
     it('renders correctly', () => {
       render(<NewComponent />)
       // Test assertions
     })
   })
   \`\`\`

### Adding New Chart Types

1. **Define Chart Interface**
   \`\`\`typescript
   // lib/chart-types.ts
   interface NewChartConfig extends BaseChartConfig {
     specificOption: string
   }
   \`\`\`

2. **Implement Chart Component**
   \`\`\`typescript
   // components/charts/new-chart.tsx
   export function NewChart({ data, config }: ChartProps) {
     // Chart implementation using Recharts
   }
   \`\`\`

3. **Register Chart Type**
   \`\`\`typescript
   // lib/chart-registry.ts
   export const CHART_TYPES = {
     // existing charts...
     newChart: {
       name: 'New Chart',
       component: NewChart,
       icon: <NewChartIcon />,
       description: 'Description of new chart'
     }
   }
   \`\`\`

## ML Algorithm Development

### Adding New Algorithms

1. **Implement Algorithm Class**
   \`\`\`typescript
   // lib/ml-models.ts
   export class NewMLAlgorithm {
     private model: any
     
     fit(features: number[][], target: number[]): void {
       // Training implementation
     }
     
     predict(features: number[][]): number[] {
       // Prediction implementation
     }
     
     score(features: number[][], target: number[]): number {
       // Evaluation implementation
     }
   }
   \`\`\`

2. **Add UI Components**
   \`\`\`typescript
   // components/ml-new-algorithm.tsx
   export function NewAlgorithmTrainer() {
     // UI for algorithm configuration and training
   }
   \`\`\`

3. **Update ML Registry**
   \`\`\`typescript
   // lib/ml-registry.ts
   export const ML_ALGORITHMS = {
     // existing algorithms...
     newAlgorithm: {
       name: 'New Algorithm',
       class: NewMLAlgorithm,
       type: 'classification', // or 'regression', 'clustering'
       component: NewAlgorithmTrainer
     }
   }
   \`\`\`

## Performance Guidelines

### Optimization Techniques

1. **React Optimization**
   \`\`\`typescript
   // Use React.memo for expensive components
   const ExpensiveComponent = React.memo(({ data }) => {
     // Component logic
   })
   
   // Use useMemo for expensive calculations
   const processedData = useMemo(() => {
     return expensiveDataProcessing(rawData)
   }, [rawData])
   
   // Use useCallback for event handlers
   const handleDataChange = useCallback((newData) => {
     setData(newData)
   }, [])
   \`\`\`

2. **Data Processing**
   \`\`\`typescript
   // Use Web Workers for heavy computations
   const worker = new Worker('/workers/data-processor.js')
   
   // Implement data streaming for large files
   const processLargeFile = async (file: File) => {
     const stream = file.stream()
     // Process in chunks
   }
   \`\`\`

3. **Bundle Optimization**
   \`\`\`typescript
   // Use dynamic imports for code splitting
   const LazyComponent = lazy(() => import('./heavy-component'))
   
   // Lazy load chart libraries
   const loadChartLibrary = () => import('heavy-chart-library')
   \`\`\`

## Accessibility Guidelines

### WCAG Compliance

1. **Keyboard Navigation**
   \`\`\`typescript
   // Ensure all interactive elements are keyboard accessible
   <button
     onClick={handleClick}
     onKeyDown={(e) => e.key === 'Enter' && handleClick()}
     aria-label="Descriptive label"
   >
     Action
   </button>
   \`\`\`

2. **Screen Reader Support**
   \`\`\`typescript
   // Use proper ARIA labels and descriptions
   <div
     role="region"
     aria-labelledby="chart-title"
     aria-describedby="chart-description"
   >
     <h2 id="chart-title">Sales Data</h2>
     <p id="chart-description">Bar chart showing sales by category</p>
     {/* Chart content */}
   </div>
   \`\`\`

3. **Color and Contrast**
   \`\`\`typescript
   // Ensure sufficient color contrast
   // Provide alternative ways to convey information besides color
   <div className="bg-blue-600 text-white"> {/* Good contrast */}
     <span className="sr-only">Important:</span> {/* Screen reader text */}
     Content
   </div>
   \`\`\`

## Release Process

### Version Management

- Follow semantic versioning (SemVer)
- Update CHANGELOG.md for each release
- Tag releases in Git

### Pre-release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Browser compatibility verified
- [ ] Security review completed

## Getting Help

### Resources

- **Documentation**: `/docs` directory
- **Examples**: `/examples` directory
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions

### Community Guidelines

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow the code of conduct

Thank you for contributing to the Next.js Data Platform! Your contributions help make data analysis more accessible and powerful for everyone.
