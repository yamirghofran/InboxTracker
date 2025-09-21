# InboxTracker - Expense Management System

A comprehensive expense management application built with modern web technologies, featuring AI-powered receipt processing, real-time data visualization, and seamless cloud integration.

## Features

### Core Functionality

- **Expense Tracking**: Create, edit, and delete expense records with detailed information
- **Receipt Management**: Upload and store receipt images with automatic data extraction
- **AI-Powered Processing**: Automatically extract expense details from receipt images using OpenAI's GPT-4
- **Category Management**: Organize expenses into predefined categories (Utilities, Entertainment, Transportation, Healthcare, etc.)
- **User Authentication**: Secure login and signup system with session management

### Data Visualization

- **Category Breakdown**: Interactive pie chart showing expenses by category
- **Monthly Trends**: Bar chart displaying spending patterns over time
- **Comprehensive Dashboard**: Real-time overview of all expense data

### Technical Features

- **Receipt Upload**: Support for image and PDF receipt formats
- **Blob Storage**: Secure cloud storage for receipt files
- **Real-time Updates**: Instant UI updates after adding, editing, or deleting expenses
- **Responsive Design**: Mobile-friendly interface built with Tailwind CSS

## Tech Stack

### Frontend

- **Remix (React)** - Full-stack web framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component library
- **Recharts** - Data visualization library
- **Lucide React** - Icon library

### Backend

- **Azure Functions** - Serverless compute platform
- **Python** - Backend logic and API endpoints
- **MySQL** - Relational database
- **Azure Blob Storage** - File storage for receipts
- **Azure Queue Storage** - Error handling and dead letter queue

### AI Integration

- **OpenAI GPT-4** - Receipt data extraction and processing

## Prerequisites

- Node.js 20.0.0 or higher
- Python 3.8 or higher
- Azure CLI
- MySQL database
- OpenAI API key
- Azure subscription (for cloud deployment)

## Installation

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create environment file:

   ```bash
   cp .env.example .env
   ```

4. Configure environment variables in `.env`:

   ```env
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend/AzureFunctions
   ```

2. Install Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Configure Azure Functions settings in `local.settings.json`:

   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "your_azure_storage_connection_string",
       "AZURE_STORAGE_CONNECTION_STRING": "your_azure_storage_connection_string",
       "MySQLConnectionString": "your_mysql_connection_string"
     }
   }
   ```

4. Start Azure Functions locally:
   ```bash
   func start
   ```

## Database Setup

Run the SQL script to create the required tables:

```bash
mysql -u username -p database_name < backend/data_definition/create_tables.sql
```

This will create the following tables:

- `Users` - User authentication and profiles
- `Categories` - Expense categories
- `Expenses` - Expense records with receipt URLs

## API Endpoints

### Authentication

- `POST /api/Login` - User login
- `POST /api/Signup` - User registration

### Expense Management

- `POST /api/CreateExpense` - Create new expense with receipt upload
- `GET /api/GetExpenses?userId={id}` - Retrieve user's expenses
- `PUT /api/UpdateExpense` - Update existing expense
- `DELETE /api/DeleteExpense?expenseId={id}&userId={id}` - Delete expense

### Categories

- `GET /api/GetCategories` - Retrieve all expense categories

## Usage

### Creating an Expense

1. Click the "Add Expense" button on the dashboard
2. Upload a receipt image (optional but recommended)
3. The AI will automatically extract:
   - Amount
   - Company name
   - Date
   - Description
   - Category
4. Review and modify the extracted information if needed
5. Add any additional notes
6. Save the expense

### Managing Expenses

- **View**: Browse all expenses in the main table
- **Edit**: Click the edit icon to modify expense details
- **Delete**: Click the delete icon to remove expenses
- **Receipts**: Click the eye icon to view uploaded receipts

### Data Analysis

- **Category View**: Use the pie chart to see spending distribution
- **Timeline View**: Use the bar chart to track monthly spending trends
- **Filtering**: Use the search functionality to find specific expenses

## Deployment

### Azure Functions Deployment

Navigate to the backend folder and run:

```bash
func azure functionapp publish InboxTracker --build remote
```

### Environment Variables

Set the following environment variables in your Azure Function App:

- `AZURE_STORAGE_CONNECTION_STRING` - Azure Storage connection string
- `MySQLConnectionString` - MySQL database connection string

## Project Structure

```
InboxTracker/
├── frontend/                 # React frontend application
│   ├── app/
│   │   ├── components/       # UI components
│   │   ├── routes/          # Application routes
│   │   └── types.ts         # TypeScript definitions
│   └── package.json
├── backend/
│   └── AzureFunctions/      # Python Azure Functions
│       ├── function_app.py  # Main function definitions
│       └── shared/          # Database utilities
└── backend/data_definition/ # Database schema
```

## Development

### Available Scripts

**Frontend:**

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks

**Backend:**

- `func start` - Start Azure Functions locally
- `func azure functionapp publish` - Deploy to Azure

### Code Quality

- ESLint configuration for frontend code quality
- TypeScript for type safety
- Comprehensive error handling and logging
- Dead letter queue for failed operations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
