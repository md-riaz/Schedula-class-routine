<script lang="ts">
	import { onMount } from 'svelte';
	import type { DayOfWeek } from '$lib/types';
	import { 
		departments, 
		teachers, 
		rooms, 
		courses, 
		timeSlots, 
		scheduleEntries,
		selectedDepartmentId,
		selectedShift,
		populatedScheduleEntries,
		validationResult,
		currentUser
	} from '$lib/stores';
	import { generateTimeSlots } from '$lib/utils/scheduler';

	// Sample data initialization
	onMount(() => {
		// Initialize current user (demo mode)
		currentUser.set({
			id: 'user-1',
			name: 'Admin User',
			email: 'admin@university.edu',
			role: 'admin'
		});

		// Initialize departments
		departments.set([
			{ id: 'dept-1', name: 'Computer Science', code: 'CSE' },
			{ id: 'dept-2', name: 'Electrical Engineering', code: 'EEE' },
			{ id: 'dept-3', name: 'Business Administration', code: 'BBA' }
		]);

		// Initialize teachers
		teachers.set([
			{ id: 'teacher-1', name: 'Dr. John Smith', email: 'john@university.edu', departmentId: 'dept-1', availableShifts: ['day', 'evening'] },
			{ id: 'teacher-2', name: 'Prof. Sarah Johnson', email: 'sarah@university.edu', departmentId: 'dept-1', availableShifts: ['day'] },
			{ id: 'teacher-3', name: 'Dr. Michael Brown', email: 'michael@university.edu', departmentId: 'dept-2', availableShifts: ['evening', 'weekend'] },
			{ id: 'teacher-4', name: 'Dr. Emily Davis', email: 'emily@university.edu', departmentId: 'dept-3', availableShifts: ['day', 'weekend'] }
		]);

		// Initialize rooms
		rooms.set([
			{ id: 'room-1', name: 'Room 101', capacity: 40, building: 'Building A', type: 'lecture' },
			{ id: 'room-2', name: 'Room 102', capacity: 50, building: 'Building A', type: 'lecture' },
			{ id: 'room-3', name: 'Lab 201', capacity: 30, building: 'Building B', type: 'lab' },
			{ id: 'room-4', name: 'Seminar Hall', capacity: 100, building: 'Building C', type: 'seminar' }
		]);

		// Initialize courses
		courses.set([
			{ id: 'course-1', name: 'Data Structures', code: 'CSE201', departmentId: 'dept-1', credits: 3, type: 'theory' },
			{ id: 'course-2', name: 'Database Lab', code: 'CSE202', departmentId: 'dept-1', credits: 1, type: 'lab' },
			{ id: 'course-3', name: 'Algorithm Design', code: 'CSE301', departmentId: 'dept-1', credits: 3, type: 'theory' },
			{ id: 'course-4', name: 'Digital Logic', code: 'EEE101', departmentId: 'dept-2', credits: 3, type: 'theory' },
			{ id: 'course-5', name: 'Management Principles', code: 'BBA101', departmentId: 'dept-3', credits: 3, type: 'theory' }
		]);

		// Generate time slots for all shifts
		const daySlots = generateTimeSlots('day');
		const eveningSlots = generateTimeSlots('evening');
		const weekendSlots = generateTimeSlots('weekend');
		timeSlots.set([...daySlots, ...eveningSlots, ...weekendSlots]);

		// Initialize some sample schedule entries
		scheduleEntries.set([
			{
				id: 'entry-1',
				courseId: 'course-1',
				teacherId: 'teacher-1',
				roomId: 'room-1',
				timeSlotId: 'day-Sunday-0',
				departmentId: 'dept-1',
				semester: 'Fall 2025',
				academicYear: '2025-2026'
			},
			{
				id: 'entry-2',
				courseId: 'course-2',
				teacherId: 'teacher-2',
				roomId: 'room-3',
				timeSlotId: 'day-Monday-1',
				departmentId: 'dept-1',
				semester: 'Fall 2025',
				academicYear: '2025-2026'
			},
			{
				id: 'entry-3',
				courseId: 'course-3',
				teacherId: 'teacher-1',
				roomId: 'room-2',
				timeSlotId: 'day-Tuesday-2',
				departmentId: 'dept-1',
				semester: 'Fall 2025',
				academicYear: '2025-2026'
			}
		]);

		selectedDepartmentId.set('dept-1');
		selectedShift.set('day');
	});

	let draggedEntry: any = null;

	function handleDragStart(event: DragEvent, entry: any) {
		draggedEntry = entry;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleDrop(event: DragEvent, timeSlotId: string) {
		event.preventDefault();
		if (draggedEntry) {
			// Update the schedule entry with new time slot
			scheduleEntries.update(entries => {
				return entries.map(entry => 
					entry.id === draggedEntry.id 
						? { ...entry, timeSlotId } 
						: entry
				);
			});
			draggedEntry = null;
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}

	// Get unique days from filtered time slots
	$: days = Array.from(new Set(
		$populatedScheduleEntries.map(e => e.timeSlot.day)
	)) as DayOfWeek[];

	// Get unique time ranges
	$: timeRanges = Array.from(new Set(
		$populatedScheduleEntries.map(e => `${e.timeSlot.startTime}-${e.timeSlot.endTime}`)
	));

	// Helper function to get entry for a specific day and time
	function getEntryForSlot(day: DayOfWeek, timeRange: string) {
		return $populatedScheduleEntries.find(entry => 
			entry.timeSlot.day === day && 
			`${entry.timeSlot.startTime}-${entry.timeSlot.endTime}` === timeRange
		);
	}
</script>

<div class="schedule-container">
	<div class="controls">
		<h2>Class Schedule</h2>
		<div class="filters">
			<select bind:value={$selectedDepartmentId}>
				<option value={null}>All Departments</option>
				{#each $departments as dept}
					<option value={dept.id}>{dept.name}</option>
				{/each}
			</select>

			<select bind:value={$selectedShift}>
				<option value="all">All Shifts</option>
				<option value="day">Day Shift</option>
				<option value="evening">Evening Shift</option>
				<option value="weekend">Weekend Shift</option>
			</select>
		</div>
	</div>

	{#if !$validationResult.valid}
		<div class="conflicts-alert">
			<h3>⚠️ Schedule Conflicts Detected</h3>
			{#each $validationResult.conflicts as conflict}
				<p>{conflict.message}</p>
			{/each}
		</div>
	{:else}
		<div class="success-alert">
			✓ No conflicts detected - Schedule is valid
		</div>
	{/if}

	<div class="timetable">
		<div class="timetable-header">
			<div class="cell header-cell">Time</div>
			{#each days as day}
				<div class="cell header-cell">{day}</div>
			{/each}
		</div>

		{#each timeRanges as timeRange}
			<div class="timetable-row">
				<div class="cell time-cell">{timeRange}</div>
				{#each days as day}
					{@const entry = getEntryForSlot(day, timeRange)}
					<div 
						class="cell schedule-cell"
						role="button"
						tabindex="0"
						ondrop={(e) => entry?.timeSlot?.id && handleDrop(e, entry.timeSlot.id)}
						ondragover={handleDragOver}
					>
						{#if entry}
							<div 
								class="schedule-entry"
								draggable="true"
								ondragstart={(e) => handleDragStart(e, entry)}
								role="button"
								tabindex="0"
							>
								<div class="course-code">{entry.course.code}</div>
								<div class="course-name">{entry.course.name}</div>
								<div class="teacher-name">{entry.teacher.name}</div>
								<div class="room-name">📍 {entry.room.name}</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/each}
	</div>

	<div class="legend">
		<h3>Features:</h3>
		<ul>
			<li>✅ Automatic conflict detection</li>
			<li>🔄 Drag and drop to reschedule</li>
			<li>📊 Multi-department support</li>
			<li>🌓 Day, Evening, and Weekend shifts</li>
			<li>👥 Role-based access (Admin, Teacher, Student)</li>
		</ul>
	</div>
</div>

<style>
	.schedule-container {
		background: white;
		border-radius: 8px;
		padding: 2rem;
		box-shadow: 0 2px 8px rgba(0,0,0,0.1);
	}

	.controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.controls h2 {
		margin: 0;
		color: #2d3748;
	}

	.filters {
		display: flex;
		gap: 1rem;
	}

	select {
		padding: 0.5rem 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 6px;
		font-size: 1rem;
		background: white;
		cursor: pointer;
	}

	select:focus {
		outline: none;
		border-color: #667eea;
	}

	.conflicts-alert {
		background: #fed7d7;
		border: 2px solid #fc8181;
		border-radius: 6px;
		padding: 1rem;
		margin-bottom: 1.5rem;
	}

	.conflicts-alert h3 {
		margin: 0 0 0.5rem 0;
		color: #c53030;
	}

	.conflicts-alert p {
		margin: 0.25rem 0;
		color: #742a2a;
	}

	.success-alert {
		background: #c6f6d5;
		border: 2px solid #68d391;
		border-radius: 6px;
		padding: 1rem;
		margin-bottom: 1.5rem;
		color: #22543d;
		font-weight: 500;
	}

	.timetable {
		overflow-x: auto;
		margin-bottom: 2rem;
	}

	.timetable-header,
	.timetable-row {
		display: grid;
		grid-template-columns: 150px repeat(auto-fit, minmax(200px, 1fr));
		gap: 1px;
		background: #e2e8f0;
	}

	.cell {
		background: white;
		padding: 1rem;
		min-height: 100px;
	}

	.header-cell {
		background: #667eea;
		color: white;
		font-weight: 600;
		text-align: center;
		min-height: auto;
		padding: 0.75rem;
	}

	.time-cell {
		background: #edf2f7;
		font-weight: 500;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
	}

	.schedule-cell {
		position: relative;
		cursor: pointer;
		transition: background 0.2s;
	}

	.schedule-cell:hover {
		background: #f7fafc;
	}

	.schedule-entry {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 0.75rem;
		border-radius: 6px;
		cursor: move;
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.schedule-entry:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
	}

	.course-code {
		font-weight: 700;
		font-size: 0.9rem;
	}

	.course-name {
		font-size: 0.85rem;
		opacity: 0.95;
	}

	.teacher-name {
		font-size: 0.8rem;
		opacity: 0.9;
		margin-top: auto;
	}

	.room-name {
		font-size: 0.8rem;
		opacity: 0.9;
	}

	.legend {
		background: #edf2f7;
		padding: 1.5rem;
		border-radius: 6px;
	}

	.legend h3 {
		margin: 0 0 1rem 0;
		color: #2d3748;
	}

	.legend ul {
		margin: 0;
		padding-left: 1.5rem;
	}

	.legend li {
		margin: 0.5rem 0;
		color: #4a5568;
	}
</style>
