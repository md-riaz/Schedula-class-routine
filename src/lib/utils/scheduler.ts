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
type TimeSlotOptions = {
        durationMinutes?: number;
        startTimes?: string[];
        days?: DayOfWeek[];
};

const DEFAULT_START_TIMES: Record<Shift, string[]> = {
        day: ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30'],
        evening: ['17:00', '18:30', '20:00'],
        weekend: ['09:00', '10:30', '12:00', '14:30', '16:00']
};

const DEFAULT_DAYS: Record<Shift, DayOfWeek[]> = {
        day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        evening: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        weekend: ['Friday', 'Saturday']
};

const DEFAULT_DURATION: Record<Shift, number> = {
        day: 90,
        evening: 90,
        weekend: 90
};

function addMinutes(time: string, minutes: number): string {
        const [hour, minute] = time.split(':').map(Number);
        const totalMinutes = hour * 60 + minute + minutes;
        const newHours = Math.floor(totalMinutes / 60) % 24;
        const newMinutes = totalMinutes % 60;
        return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

export function generateTimeSlots(shift: Shift, options: TimeSlotOptions = {}): TimeSlot[] {
        const slots: TimeSlot[] = [];
        const startTimes = options.startTimes ?? DEFAULT_START_TIMES[shift];
        const days = options.days ?? DEFAULT_DAYS[shift];
        const duration = options.durationMinutes ?? DEFAULT_DURATION[shift];

        days.forEach(day => {
                startTimes.forEach((startTime, index) => {
                        const endTime = addMinutes(startTime, duration);
                        slots.push({
                                id: `${shift}-${day}-${index}`,
                                day,
                                startTime,
                                endTime,
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
