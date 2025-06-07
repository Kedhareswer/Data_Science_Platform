# Data Analysis Platform

A modern, interactive data analysis and visualization platform built with Next.js, React, and TypeScript. This application allows users to upload, explore, analyze, and visualize their data through an intuitive notebook interface.

## 🚀 Features

- **Interactive Notebook Interface**: Create and organize multiple analysis notebooks
- **Data Upload**: Supports CSV and Excel file uploads
- **Data Exploration**: Built-in data table viewer with sorting and filtering
- **Data Visualization**: Multiple chart types including bar charts, line charts, and more
- **Data Preprocessing**: Tools for cleaning and transforming your data
- **Code Editor**: Write and execute custom data analysis code
- **Responsive Design**: Works on desktop and tablet devices
- **Dark/Light Mode**: Built-in theme support for comfortable viewing

## 🛠️ Technologies Used

- **Frontend Framework**: Next.js 13+ with App Router
- **UI Components**: Radix UI Primitives with custom styling
- **Styling**: Tailwind CSS with custom theming
- **Data Handling**: React Hook Form, Zod for validation
- **Data Visualization**: Recharts
- **File Parsing**: PapaParse, XLSX
- **State Management**: React Context API
- **Code Editing**: Monaco Editor
- **Icons**: Lucide Icons
- **Build Tool**: Vite

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0.0 or later
- npm or yarn package manager

### Installation

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/Kedhareswer/Data_Science_Platform.git
   cd Data_Science_Platform
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

3. Start the development server:
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 📦 Project Structure

\`\`\`
data-analysis-platform/
├── app/                    # App router pages and layouts
│   ├── dashboard/          # Dashboard components
│   ├── notebook/           # Notebook interface
│   └── ...
├── components/             # Reusable UI components
│   ├── ui/                 # Shadcn/ui components
│   ├── data-table.tsx      # Data table component
│   ├── data-visualizer.tsx # Chart components
│   └── ...
├── lib/                   # Utility functions and hooks
├── public/                 # Static assets
└── styles/                 # Global styles
\`\`\`

## 🧪 Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components powered by [Radix UI](https://www.radix-ui.com/)
- Icons by [Lucide](https://lucide.dev/)
- Data visualization with [Recharts](https://recharts.org/)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
