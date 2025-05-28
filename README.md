# Daily Planner Application

A comprehensive daily planner application with calendar view, task management, time scheduling, and data visualization features.

## Features

- **Calendar View**: Interactive calendar showing available dates with data
- **Daily Planning**: Manage priorities, todo lists, and checklists
- **Time Scheduling**: Visual time blocks with drag-and-drop functionality
- **Pie Charts**: Visual representation of time allocation
- **Theme Toggle**: Switch between classic and modern UI designs
- **Data Persistence**: PostgreSQL database with automatic migration from JSON files

## Quick Start

### Local Development (SQLite)

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Database**
   ```bash
   npm run setup
   ```
   This will create the SQLite database and migrate existing data from the `data/` folder.

3. **Start the Application**
   ```bash
   npm start
   ```

4. **Open in Browser**
   Navigate to `http://localhost:3000`

### Testing the Application

1. **Calendar View**: 
   - Open `http://localhost:3000`
   - You should see a calendar with green dates (existing data) and gray dates (no data)
   - Click on any date to open the daily planner

2. **Daily Planner**:
   - Add items to priorities, todo, and checklist sections
   - Use the time scheduler to add time blocks
   - Test the pie chart by clicking "Show Pie Chart" button
   - Toggle between classic and modern themes

3. **Theme Toggle**:
   - Use the toggle switch in the top-right corner
   - Theme preference is saved in localStorage

### Recent Fixes Applied

✅ **Content Security Policy (CSP) Issues**
- Fixed inline event handler violations
- Added proper CSP directives for script execution

✅ **Pie Chart Functionality**
- Fixed duplicate ID issues with time overlays
- Updated selectors to use classes instead of IDs
- Added proper color definitions for chart rendering

✅ **Database Configuration**
- Configured SQLite for local development (no PostgreSQL required)
- Maintained PostgreSQL configuration for production deployment

## Production Deployment (Heroku)

### Prerequisites
- Heroku CLI installed
- PostgreSQL addon configured

### Deploy Steps

1. **Create Heroku App**
   ```bash
   heroku create your-app-name
   ```

2. **Add PostgreSQL**
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

3. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy daily planner"
   git push heroku main
   ```

4. **Run Migrations**
   ```bash
   heroku run npm run setup
   ```

## Project Structure

```
├── app.js                 # Express server
├── knexfile.js           # Database configuration
├── package.json          # Dependencies and scripts
├── migrations/           # Database schema migrations
├── seeds/               # Data migration scripts
├── public/              # Frontend files
│   ├── index.html       # Calendar view
│   ├── template.html    # Daily planner
│   ├── script.js        # Application logic
│   ├── style.css        # Classic theme
│   └── style-modern.css # Modern theme
└── data/               # Original JSON data files
```

## API Endpoints

- `GET /` - Calendar view
- `GET /dates` - Get all available dates
- `GET /data/:date` - Get daily data for specific date
- `POST /save` - Save daily data
- `GET /checklist` - Get global checklist
- `POST /checklist` - Update checklist

## Environment Variables

### Development (SQLite)
No environment variables required.

### Production (PostgreSQL)
- `DATABASE_URL` - PostgreSQL connection string (auto-set by Heroku)
- `NODE_ENV=production`

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   taskkill /f /im node.exe  # Windows
   # or
   pkill node                # macOS/Linux
   ```

2. **Database connection errors**
   - For local development: Ensure SQLite database exists (`npm run setup`)
   - For production: Verify PostgreSQL addon is configured

3. **CSP violations in browser console**
   - These should be resolved with recent fixes
   - If issues persist, check browser developer tools for specific errors

4. **Pie chart not showing**
   - Add some time periods using the time scheduler first
   - Ensure time overlays have valid start/end times

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License 