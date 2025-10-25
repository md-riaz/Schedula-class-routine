import type { 
	ScheduleEntry, 
	TimeSlot, 
	Teacher, 
	Room, 
	Course,
	Shift,
	DayOfWeek
} from '$lib/types';
import { canAddEntry } from './validation';

/**
 * Generate time slots for different shifts
 */
export function generateTimeSlots(shift: Shift): TimeSlot[] {
	const slots: TimeSlot[] = [];
	const days: DayOfWeek[] = shift === 'weekend' 
		? ['Friday', 'Saturday'] 
		: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

	let timeRanges: { start: string; end: string; duration: number }[] = [];

	switch (shift) {
		case 'day':
			timeRanges = [
				{ start: '08:00', end: '09:30', duration: 90 },
				{ start: '09:30', end: '11:00', duration: 90 },
				{ start: '11:00', end: '12:30', duration: 90 },
				{ start: '12:30', end: '14:00', duration: 90 },
				{ start: '14:00', end: '15:30', duration: 90 },
				{ start: '15:30', end: '17:00', duration: 90 }
			];
			break;
		case 'evening':
			timeRanges = [
				{ start: '17:00', end: '18:30', duration: 90 },
				{ start: '18:30', end: '20:00', duration: 90 },
				{ start: '20:00', end: '21:30', duration: 90 }
			];
			break;
		case 'weekend':
			timeRanges = [
				{ start: '09:00', end: '10:30', duration: 90 },
				{ start: '10:30', end: '12:00', duration: 90 },
				{ start: '12:00', end: '13:30', duration: 90 },
				{ start: '14:30', end: '16:00', duration: 90 },
				{ start: '16:00', end: '17:30', duration: 90 }
			];
			break;
	}

	days.forEach(day => {
		timeRanges.forEach((range, index) => {
			slots.push({
				id: `${shift}-${day}-${index}`,
				day,
				startTime: range.start,
				endTime: range.end,
				shift
			});
		});
	});

	return slots;
}

/**
 * Auto-schedule courses for a department
 */
export function autoSchedule(
	courses: Course[],
	teachers: Teacher[],
	rooms: Room[],
	timeSlots: TimeSlot[],
	departmentId: string,
	semester: string,
	academicYear: string
): ScheduleEntry[] {
	const entries: ScheduleEntry[] = [];
	const teacherMap = new Map(teachers.map(t => [t.id, t]));
	const roomMap = new Map(rooms.map(r => [r.id, r]));
	const timeSlotMap = new Map(timeSlots.map(ts => [ts.id, ts]));

	// Sort courses by credits (descending) to schedule more important courses first
	const sortedCourses = [...courses].sort((a, b) => b.credits - a.credits);

	for (const course of sortedCourses) {
		// Find available teachers from the same department
		const availableTeachers = teachers.filter(t => t.departmentId === departmentId);
		
		// Find suitable rooms based on course type
		const suitableRooms = rooms.filter(room => {
			if (course.type === 'lab') return room.type === 'lab';
			if (course.type === 'practical') return room.type === 'lab' || room.type === 'seminar';
			return room.type === 'lecture' || room.type === 'seminar';
		});

		let scheduled = false;

		// Try to schedule the course
		for (const teacher of availableTeachers) {
			if (scheduled) break;

			for (const room of suitableRooms) {
				if (scheduled) break;

				for (const timeSlot of timeSlots) {
					const newEntry: ScheduleEntry = {
						id: `entry-${entries.length + 1}`,
						courseId: course.id,
						teacherId: teacher.id,
						roomId: room.id,
						timeSlotId: timeSlot.id,
						departmentId,
						semester,
						academicYear
					};

					const { canAdd } = canAddEntry(newEntry, entries, timeSlotMap, teacherMap, roomMap);

					if (canAdd) {
						entries.push(newEntry);
						scheduled = true;
						break;
					}
				}
			}
		}
	}

	return entries;
}

/**
 * Get available time slots for a teacher
 */
export function getAvailableTimeSlotsForTeacher(
	teacherId: string,
	existingEntries: ScheduleEntry[],
	allTimeSlots: TimeSlot[],
	timeSlotMap: Map<string, TimeSlot>
): TimeSlot[] {
	const teacherEntries = existingEntries.filter(e => e.teacherId === teacherId);
	const occupiedSlotIds = teacherEntries.map(e => e.timeSlotId);

	return allTimeSlots.filter(slot => !occupiedSlotIds.includes(slot.id));
}

/**
 * Get available rooms for a time slot
 */
export function getAvailableRoomsForTimeSlot(
	timeSlotId: string,
	existingEntries: ScheduleEntry[],
	allRooms: Room[]
): Room[] {
	const slotEntries = existingEntries.filter(e => e.timeSlotId === timeSlotId);
	const occupiedRoomIds = slotEntries.map(e => e.roomId);

	return allRooms.filter(room => !occupiedRoomIds.includes(room.id));
}
