# Schedula - Smart University Class Routine Management

Schedula is a smart university class routine management SPA built with SvelteKit. It automates timetable creation for day, evening, and weekend shifts, ensuring no overlapping of classes, teachers, or rooms. The system supports multiple departments, conflict detection, drag-and-drop scheduling, and role-based access for admins, teachers, and students.

## Features

✅ **Automatic Conflict Detection** - Real-time validation to prevent overlapping classes, teachers, and rooms

🔄 **Drag and Drop Scheduling** - Intuitive interface for rescheduling classes by dragging and dropping

📊 **Multi-Department Support** - Manage schedules for multiple departments simultaneously

🌓 **Multiple Shifts** - Support for Day, Evening, and Weekend shifts with dedicated time slots

👥 **Role-Based Access Control** - Different views and permissions for Admins, Teachers, and Students

🎯 **Smart Scheduling Algorithm** - Automated timetable generation based on constraints

📅 **Visual Timetable Grid** - Clear visualization of weekly schedules

## Tech Stack

- **Framework**: SvelteKit 2.0 with TypeScript
- **Styling**: Custom CSS with gradient themes
- **State Management**: Svelte stores
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/md-riaz/Schedula-class-routine.git
cd Schedula-class-routine

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── lib/
│   ├── components/      # Reusable Svelte components
│   ├── stores/          # Svelte stores for state management
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
│       ├── validation.ts    # Conflict detection and validation
│       └── scheduler.ts     # Scheduling algorithms
├── routes/
│   ├── +layout.svelte   # Main layout with navigation
│   └── +page.svelte     # Schedule view page
└── app.html             # HTML template

```

## Key Concepts

### Data Models

- **Department**: Academic departments (e.g., Computer Science, EEE)
- **Teacher**: Faculty members with availability and department assignments
- **Room**: Physical spaces with capacity and type (lecture, lab, seminar)
- **Course**: Academic courses with credits and type
- **TimeSlot**: Time periods with day, start/end time, and shift
- **ScheduleEntry**: Links courses, teachers, rooms, and time slots

### Conflict Detection

The system automatically detects:
- Teacher conflicts (same teacher scheduled at overlapping times)
- Room conflicts (same room booked for overlapping times)
- Student group conflicts (future enhancement)

### Shifts

- **Day Shift**: Sunday-Thursday, 8:00 AM - 5:00 PM
- **Evening Shift**: Sunday-Thursday, 5:00 PM - 9:30 PM
- **Weekend Shift**: Friday-Saturday, 9:00 AM - 5:30 PM

## Usage

1. **View Schedule**: Navigate to the main page to see the timetable grid
2. **Filter by Department**: Select a department from the dropdown
3. **Filter by Shift**: Choose Day, Evening, Weekend, or All shifts
4. **Drag and Drop**: Click and drag schedule entries to reschedule them
5. **Conflict Alerts**: View real-time alerts when conflicts are detected

## Development

```bash
# Type checking
npm run check

# Type checking in watch mode
npm run check:watch
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Contact

For questions or feedback, please open an issue on GitHub.
