import type { 
	ScheduleEntry, 
	TimeSlot, 
	Conflict, 
	ValidationResult,
	Teacher,
	Room,
	Course
} from '$lib/types';

/**
 * Check if two time slots overlap
 */
export function timeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
	if (slot1.day !== slot2.day) return false;

	const start1 = timeToMinutes(slot1.startTime);
	const end1 = timeToMinutes(slot1.endTime);
	const start2 = timeToMinutes(slot2.startTime);
	const end2 = timeToMinutes(slot2.endTime);

	return (start1 < end2 && start2 < end1);
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
	const [hours, minutes] = time.split(':').map(Number);
	return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export function minutesToTime(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Detect conflicts in schedule entries
 */
export function detectConflicts(
	entries: ScheduleEntry[],
	timeSlots: Map<string, TimeSlot>,
	teachers: Map<string, Teacher>,
	rooms: Map<string, Room>
): Conflict[] {
	const conflicts: Conflict[] = [];

	// Check for teacher conflicts (same teacher, overlapping time slots)
	const teacherMap = new Map<string, ScheduleEntry[]>();
	entries.forEach(entry => {
		const teacherId = entry.teacherId;
		if (!teacherMap.has(teacherId)) {
			teacherMap.set(teacherId, []);
		}
		teacherMap.get(teacherId)!.push(entry);
	});

	teacherMap.forEach((teacherEntries, teacherId) => {
		const teacher = teachers.get(teacherId);
		for (let i = 0; i < teacherEntries.length; i++) {
			for (let j = i + 1; j < teacherEntries.length; j++) {
				const slot1 = timeSlots.get(teacherEntries[i].timeSlotId);
				const slot2 = timeSlots.get(teacherEntries[j].timeSlotId);
				
				if (slot1 && slot2 && timeSlotsOverlap(slot1, slot2)) {
					conflicts.push({
						type: 'teacher',
						entries: [teacherEntries[i], teacherEntries[j]],
						message: `Teacher ${teacher?.name || teacherId} has overlapping classes`
					});
				}
			}
		}
	});

	// Check for room conflicts (same room, overlapping time slots)
	const roomMap = new Map<string, ScheduleEntry[]>();
	entries.forEach(entry => {
		const roomId = entry.roomId;
		if (!roomMap.has(roomId)) {
			roomMap.set(roomId, []);
		}
		roomMap.get(roomId)!.push(entry);
	});

	roomMap.forEach((roomEntries, roomId) => {
		const room = rooms.get(roomId);
		for (let i = 0; i < roomEntries.length; i++) {
			for (let j = i + 1; j < roomEntries.length; j++) {
				const slot1 = timeSlots.get(roomEntries[i].timeSlotId);
				const slot2 = timeSlots.get(roomEntries[j].timeSlotId);
				
				if (slot1 && slot2 && timeSlotsOverlap(slot1, slot2)) {
					conflicts.push({
						type: 'room',
						entries: [roomEntries[i], roomEntries[j]],
						message: `Room ${room?.name || roomId} has overlapping classes`
					});
				}
			}
		}
	});

	return conflicts;
}

/**
 * Validate a schedule
 */
export function validateSchedule(
	entries: ScheduleEntry[],
	timeSlots: Map<string, TimeSlot>,
	teachers: Map<string, Teacher>,
	rooms: Map<string, Room>
): ValidationResult {
	const conflicts = detectConflicts(entries, timeSlots, teachers, rooms);
	return {
		valid: conflicts.length === 0,
		conflicts
	};
}

/**
 * Check if a new entry would create conflicts
 */
export function canAddEntry(
	newEntry: ScheduleEntry,
	existingEntries: ScheduleEntry[],
	timeSlots: Map<string, TimeSlot>,
	teachers: Map<string, Teacher>,
	rooms: Map<string, Room>
): { canAdd: boolean; conflicts: Conflict[] } {
	const allEntries = [...existingEntries, newEntry];
	const conflicts = detectConflicts(allEntries, timeSlots, teachers, rooms);
	
	// Filter conflicts that involve the new entry
	const relevantConflicts = conflicts.filter(conflict => 
		conflict.entries.some(entry => entry.id === newEntry.id)
	);

	return {
		canAdd: relevantConflicts.length === 0,
		conflicts: relevantConflicts
	};
}
