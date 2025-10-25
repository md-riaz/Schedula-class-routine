import { writable, derived, type Writable } from 'svelte/store';
import type {
	Department,
	Teacher,
	Room,
	Course,
	TimeSlot,
	ScheduleEntry,
	User,
	Shift,
	ScheduleEntryPopulated
} from '$lib/types';
import { validateSchedule } from '$lib/utils/validation';

// User and authentication
export const currentUser: Writable<User | null> = writable(null);

// Core data stores
export const departments: Writable<Department[]> = writable([]);
export const teachers: Writable<Teacher[]> = writable([]);
export const rooms: Writable<Room[]> = writable([]);
export const courses: Writable<Course[]> = writable([]);
export const timeSlots: Writable<TimeSlot[]> = writable([]);
export const scheduleEntries: Writable<ScheduleEntry[]> = writable([]);

// Selected department and shift filters
export const selectedDepartmentId: Writable<string | null> = writable(null);
export const selectedShift: Writable<Shift | 'all'> = writable('all');
export const selectedSemester: Writable<string> = writable('Fall 2025');
export const selectedAcademicYear: Writable<string> = writable('2025-2026');

// Derived stores
export const departmentMap = derived(departments, $departments => 
	new Map($departments.map(d => [d.id, d]))
);

export const teacherMap = derived(teachers, $teachers => 
	new Map($teachers.map(t => [t.id, t]))
);

export const roomMap = derived(rooms, $rooms => 
	new Map($rooms.map(r => [r.id, r]))
);

export const courseMap = derived(courses, $courses => 
	new Map($courses.map(c => [c.id, c]))
);

export const timeSlotMap = derived(timeSlots, $timeSlots => 
	new Map($timeSlots.map(ts => [ts.id, ts]))
);

// Filtered time slots based on selected shift
export const filteredTimeSlots = derived(
	[timeSlots, selectedShift],
	([$timeSlots, $selectedShift]) => {
		if ($selectedShift === 'all') return $timeSlots;
		return $timeSlots.filter(ts => ts.shift === $selectedShift);
	}
);

// Filtered schedule entries
export const filteredScheduleEntries = derived(
	[scheduleEntries, selectedDepartmentId, selectedShift, selectedSemester, selectedAcademicYear],
	([$scheduleEntries, $selectedDepartmentId, $selectedShift, $selectedSemester, $selectedAcademicYear]) => {
		return $scheduleEntries.filter(entry => {
			if ($selectedDepartmentId && entry.departmentId !== $selectedDepartmentId) return false;
			if ($selectedSemester && entry.semester !== $selectedSemester) return false;
			if ($selectedAcademicYear && entry.academicYear !== $selectedAcademicYear) return false;
			return true;
		}).filter(entry => {
			if ($selectedShift === 'all') return true;
			// Need to check the time slot's shift
			return true; // This would need to be implemented with timeSlot lookup
		});
	}
);

// Populated schedule entries with full object details
export const populatedScheduleEntries = derived(
	[filteredScheduleEntries, courseMap, teacherMap, roomMap, timeSlotMap],
	([$filteredScheduleEntries, $courseMap, $teacherMap, $roomMap, $timeSlotMap]) => {
		return $filteredScheduleEntries.map(entry => ({
			...entry,
			course: $courseMap.get(entry.courseId)!,
			teacher: $teacherMap.get(entry.teacherId)!,
			room: $roomMap.get(entry.roomId)!,
			timeSlot: $timeSlotMap.get(entry.timeSlotId)!
		})).filter(entry => entry.course && entry.teacher && entry.room && entry.timeSlot) as ScheduleEntryPopulated[];
	}
);

// Validation results
export const validationResult = derived(
	[scheduleEntries, timeSlotMap, teacherMap, roomMap],
	([$scheduleEntries, $timeSlotMap, $teacherMap, $roomMap]) => {
		return validateSchedule($scheduleEntries, $timeSlotMap, $teacherMap, $roomMap);
	}
);

// Has conflicts indicator
export const hasConflicts = derived(
	validationResult,
	$validationResult => !$validationResult.valid
);
