// Core types for Schedula class routine management system

export type UserRole = 'admin' | 'teacher' | 'student';

export type Shift = 'day' | 'evening' | 'weekend';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface User {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	departmentId?: string;
}

export interface Department {
	id: string;
	name: string;
	code: string;
}

export interface Teacher {
	id: string;
	name: string;
	email: string;
	departmentId: string;
	availableShifts: Shift[];
}

export interface Room {
	id: string;
	name: string;
	capacity: number;
	building: string;
	type: 'lecture' | 'lab' | 'seminar';
}

export interface Course {
	id: string;
	name: string;
	code: string;
	departmentId: string;
	credits: number;
	type: 'theory' | 'lab' | 'practical';
}

export interface TimeSlot {
	id: string;
	day: DayOfWeek;
	startTime: string; // Format: "HH:MM"
	endTime: string;   // Format: "HH:MM"
	shift: Shift;
}

export interface ScheduleEntry {
	id: string;
	courseId: string;
	teacherId: string;
	roomId: string;
	timeSlotId: string;
	departmentId: string;
	semester: string;
	academicYear: string;
	batch?: string; // e.g., "27B", "26B", etc.
	isShared?: boolean; // Indicates if this is a merged class serving multiple batches/departments
	sharedWith?: string; // e.g., "CSE+EEE+CE" or "Multiple Batches"
}

export interface Conflict {
	type: 'teacher' | 'room' | 'student';
	entries: ScheduleEntry[];
	message: string;
}

export interface Schedule {
	id: string;
	departmentId: string;
	semester: string;
	academicYear: string;
	shift: Shift;
	entries: ScheduleEntry[];
	createdAt: Date;
	updatedAt: Date;
}

// Populated types for display
export interface ScheduleEntryPopulated extends ScheduleEntry {
	course: Course;
	teacher: Teacher;
	room: Room;
	timeSlot: TimeSlot;
}

export interface ValidationResult {
	valid: boolean;
	conflicts: Conflict[];
}
