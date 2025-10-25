<script lang="ts">
	import { onMount } from 'svelte';
	import type { DayOfWeek, TimeSlot } from '$lib/types';
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
		currentUser,
		filteredTimeSlots
	} from '$lib/stores';
	import { generateTimeSlots } from '$lib/utils/scheduler';

	// Sample data initialization
	onMount(() => {
		// Initialize current user (demo mode)
		currentUser.set({
			id: 'user-1',
			name: 'Admin User',
			email: 'admin@pust.edu',
			role: 'admin'
		});

		// Initialize departments - Pundra University of Science & Technology
		departments.set([
			{ id: 'dept-cse', name: 'Computer Science & Engineering', code: 'CSE' },
			{ id: 'dept-eee', name: 'Electrical & Electronic Engineering', code: 'EEE' },
			{ id: 'dept-ce', name: 'Civil Engineering', code: 'CE' }
		]);

		// Initialize teachers based on the routine (using their initials)
		teachers.set([
			{ id: 'teacher-ric', name: 'RIC', email: 'ric@pust.edu', departmentId: 'dept-eee', availableShifts: ['day'] },
			{ id: 'teacher-mj', name: 'MJ', email: 'mj@pust.edu', departmentId: 'dept-cse', availableShifts: ['day'] },
			{ id: 'teacher-nh', name: 'NH', email: 'nh@pust.edu', departmentId: 'dept-cse', availableShifts: ['day'] },
			{ id: 'teacher-sr', name: 'SR', email: 'sr@pust.edu', departmentId: 'dept-cse', availableShifts: ['day'] },
			{ id: 'teacher-ejs', name: 'EJS', email: 'ejs@pust.edu', departmentId: 'dept-cse', availableShifts: ['day'] },
			{ id: 'teacher-amar', name: 'AMAR', email: 'amar@pust.edu', departmentId: 'dept-cse', availableShifts: ['day'] },
			{ id: 'teacher-jh', name: 'JH', email: 'jh@pust.edu', departmentId: 'dept-cse', availableShifts: ['day'] },
			{ id: 'teacher-uhl', name: 'UHL', email: 'uhl@pust.edu', departmentId: 'dept-cse', availableShifts: ['day'] },
			{ id: 'teacher-mrk', name: 'MRK', email: 'mrk@pust.edu', departmentId: 'dept-cse', availableShifts: ['day'] },
			{ id: 'teacher-rrp', name: 'RRP', email: 'rrp@pust.edu', departmentId: 'dept-cse', availableShifts: ['day'] },
			{ id: 'teacher-mbi', name: 'MBI', email: 'mbi@pust.edu', departmentId: 'dept-cse', availableShifts: ['day'] },
			{ id: 'teacher-mri', name: 'MRI', email: 'mri@pust.edu', departmentId: 'dept-eee', availableShifts: ['day'] },
			{ id: 'teacher-rh', name: 'RH', email: 'rh@pust.edu', departmentId: 'dept-eee', availableShifts: ['day'] },
			{ id: 'teacher-itm', name: 'ITM', email: 'itm@pust.edu', departmentId: 'dept-cse', availableShifts: ['day'] },
			{ id: 'teacher-mzi', name: 'MZI', email: 'mzi@pust.edu', departmentId: 'dept-cse', availableShifts: ['day'] },
			{ id: 'teacher-aam', name: 'AAM', email: 'aam@pust.edu', departmentId: 'dept-cse', availableShifts: ['day'] },
			{ id: 'teacher-mra', name: 'MRA', email: 'mra@pust.edu', departmentId: 'dept-eee', availableShifts: ['day'] },
			{ id: 'teacher-mm', name: 'MM', email: 'mm@pust.edu', departmentId: 'dept-cse', availableShifts: ['day'] },
			{ id: 'teacher-fsf', name: 'FSF', email: 'fsf@pust.edu', departmentId: 'dept-cse', availableShifts: ['day'] }
		]);

		// Initialize rooms - New Building (NB) format
		rooms.set([
			{ id: 'room-nb-508', name: 'NB-508', capacity: 50, building: 'New Building', type: 'lecture' },
			{ id: 'room-nb-504', name: 'NB-504', capacity: 60, building: 'New Building', type: 'lecture' },
			{ id: 'room-nb-408', name: 'NB-408', capacity: 45, building: 'New Building', type: 'lecture' },
			{ id: 'room-nb-703', name: 'NB-703', capacity: 70, building: 'New Building', type: 'lecture' },
			{ id: 'room-nb-503', name: 'NB-503', capacity: 50, building: 'New Building', type: 'lecture' },
			{ id: 'room-nb-502', name: 'NB-502', capacity: 50, building: 'New Building', type: 'lecture' },
			{ id: 'room-nb-406', name: 'NB-406', capacity: 45, building: 'New Building', type: 'lecture' },
			{ id: 'room-nb-407', name: 'NB-407', capacity: 45, building: 'New Building', type: 'lab' },
			{ id: 'room-nb-501', name: 'NB-501', capacity: 50, building: 'New Building', type: 'lecture' },
			{ id: 'room-nb-702', name: 'NB-702', capacity: 70, building: 'New Building', type: 'lecture' },
			{ id: 'room-nb-608', name: 'NB-608', capacity: 60, building: 'New Building', type: 'lab' },
			{ id: 'room-nb-505', name: 'NB-505', capacity: 50, building: 'New Building', type: 'lecture' },
			{ id: 'room-nb-506', name: 'NB-506', capacity: 50, building: 'New Building', type: 'lecture' }
		]);

		// Initialize courses from the Pundra University routine
		courses.set([
			// Batch 27B courses
			{ id: 'course-eee-1101', name: 'Basic Electrical Engineering', code: 'EEE-1101', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-mat-1101', name: 'Mathematics I', code: 'MAT-1101', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-phy-1101', name: 'Physics I', code: 'PHY-1101', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-eee-1102', name: 'Basic Electrical Engineering Lab', code: 'EEE-1102', departmentId: 'dept-cse', credits: 1, type: 'lab' },
			{ id: 'course-eng-1101', name: 'English I', code: 'ENG-1101', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			
			// Batch 26B courses
			{ id: 'course-mth-1201', name: 'Mathematics II', code: 'MTH-1201', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-cse-1203', name: 'Structured Programming', code: 'CSE-1203', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-eee-1201', name: 'Electrical Circuits', code: 'EEE-1201', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-phy-1201', name: 'Physics II', code: 'PHY-1201', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-cse-1204', name: 'Structured Programming Lab', code: 'CSE-1204', departmentId: 'dept-cse', credits: 1, type: 'lab' },
			
			// Batch 25B courses
			{ id: 'course-cse-2105', name: 'Data Structures', code: 'CSE-2105', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-bus-2201', name: 'Business Studies', code: 'BUS-2201', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-mth-2101', name: 'Discrete Mathematics', code: 'MTH-2101', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			
			// Batch 24B courses - no new courses needed from above
			
			// Batch 23B courses
			{ id: 'course-cse-2203', name: 'Object Oriented Programming', code: 'CSE-2203', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-lamp-3201', name: 'LAMP Programming', code: 'LAMP-3201', departmentId: 'dept-cse', credits: 3, type: 'practical' },
			{ id: 'course-bus-3101', name: 'Business Communication', code: 'BUS-3101', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-cse-4103', name: 'Software Engineering', code: 'CSE-4103', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			
			// Batch 22B courses
			{ id: 'course-cse-3100', name: 'Algorithm Design', code: 'CSE-3100', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-cse-3103', name: 'Database Systems', code: 'CSE-3103', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-cse-3201', name: 'Computer Architecture', code: 'CSE-3201', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-cse-3205', name: 'Operating Systems', code: 'CSE-3205', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-cse-3204', name: 'Computer Networks', code: 'CSE-3204', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-cse-3206', name: 'Operating Systems Lab', code: 'CSE-3206', departmentId: 'dept-cse', credits: 1, type: 'lab' },
			
			// Batch 21B courses
			{ id: 'course-cse-4201', name: 'Compiler Design', code: 'CSE-4201', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-cse-3200', name: 'Microprocessor & Assembly Language', code: 'CSE-3200', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-cse-4104', name: 'Software Engineering Lab', code: 'CSE-4104', departmentId: 'dept-cse', credits: 1, type: 'lab' },
			{ id: 'course-cse-4205', name: 'Artificial Intelligence', code: 'CSE-4205', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			
			// Batch 20B courses
			{ id: 'course-cse-4206', name: 'Machine Learning', code: 'CSE-4206', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-cse-3207', name: 'Web Technologies', code: 'CSE-3207', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-cse-483', name: 'Cloud Computing', code: 'CSE-483', departmentId: 'dept-cse', credits: 3, type: 'theory' },
			{ id: 'course-cse-453', name: 'Cyber Security', code: 'CSE-453', departmentId: 'dept-cse', credits: 3, type: 'theory' }
		]);

		// Generate time slots for all shifts with times matching Pundra University
		// Day shift time slots matching the routine
		const daySlots: TimeSlot[] = [];
		const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'];
		
		// Time slots for day shift based on the routine
		const dayTimeRanges = [
			{ start: '09:30', end: '11:00' },
			{ start: '11:10', end: '12:40' },
			{ start: '14:00', end: '15:30' },
			{ start: '15:30', end: '17:00' }
		];

		days.forEach(day => {
			dayTimeRanges.forEach((range, index) => {
				daySlots.push({
					id: `day-${day}-${index}`,
					day,
					startTime: range.start,
					endTime: range.end,
					shift: 'day'
				});
			});
		});

		const eveningSlots = generateTimeSlots('evening');
		const weekendSlots = generateTimeSlots('weekend');
		timeSlots.set([...daySlots, ...eveningSlots, ...weekendSlots]);

		// Initialize schedule entries based on Pundra University routine - EXACT MATCH
		scheduleEntries.set([
			// SATURDAY 9:30-11:00 - Multiple batches
			{
				id: 'entry-sat-27b-slot0',
				courseId: 'course-eee-1101',
				teacherId: 'teacher-ric',
				roomId: 'room-nb-508',
				timeSlotId: 'day-Saturday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '27B'
			},
			{
				id: 'entry-sat-26b-slot0',
				courseId: 'course-mth-1201',
				teacherId: 'teacher-mj',
				roomId: 'room-nb-504',
				timeSlotId: 'day-Saturday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '26B'
			},
			{
				id: 'entry-sat-23b-slot0',
				courseId: 'course-cse-2203',
				teacherId: 'teacher-amar',
				roomId: 'room-nb-503',
				timeSlotId: 'day-Saturday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '23B'
			},
			{
				id: 'entry-sat-22b-slot0',
				courseId: 'course-cse-3100',
				teacherId: 'teacher-sr',
				roomId: 'room-nb-406',
				timeSlotId: 'day-Saturday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '22B'
			},
			{
				id: 'entry-sat-21b-slot0',
				courseId: 'course-cse-4201',
				teacherId: 'teacher-rrp',
				roomId: 'room-nb-408',
				timeSlotId: 'day-Saturday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '21B'
			},
			
			// SATURDAY 11:10-12:40 - Multiple batches
			{
				id: 'entry-sat-27b-slot1',
				courseId: 'course-mat-1101',
				teacherId: 'teacher-mj',
				roomId: 'room-nb-504',
				timeSlotId: 'day-Saturday-1',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '27B',
				isShared: true,
				sharedWith: 'CSE+EEE+CE'
			},
			{
				id: 'entry-sat-26b-slot1',
				courseId: 'course-cse-1203',
				teacherId: 'teacher-nh',
				roomId: 'room-nb-408',
				timeSlotId: 'day-Saturday-1',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '26B'
			},
			{
				id: 'entry-sat-25b-slot1',
				courseId: 'course-cse-2105',
				teacherId: 'teacher-sr',
				roomId: 'room-nb-508',
				timeSlotId: 'day-Saturday-1',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '25B'
			},
			{
				id: 'entry-sat-22b-slot1',
				courseId: 'course-cse-3103',
				teacherId: 'teacher-mrk',
				roomId: 'room-nb-502',
				timeSlotId: 'day-Saturday-1',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '22B'
			},
			
			// SATURDAY 2:00-3:30 PM - Multiple batches
			{
				id: 'entry-sat-25b-slot2',
				courseId: 'course-bus-2201',
				teacherId: 'teacher-ejs',
				roomId: 'room-nb-703',
				timeSlotId: 'day-Saturday-2',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '25B',
				isShared: true,
				sharedWith: 'CSE+EEE+CE (with 24B)'
			},
			{
				id: 'entry-sat-23b-slot2',
				courseId: 'course-lamp-3201',
				teacherId: 'teacher-jh',
				roomId: 'room-nb-508',
				timeSlotId: 'day-Saturday-2',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '23B'
			},
			{
				id: 'entry-sat-21b-slot2',
				courseId: 'course-cse-3200',
				teacherId: 'teacher-mbi',
				roomId: 'room-nb-407',
				timeSlotId: 'day-Saturday-2',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '21B'
			},
			
			// SATURDAY 3:30-5:00 PM
			{
				id: 'entry-sat-23b-slot3',
				courseId: 'course-bus-3101',
				teacherId: 'teacher-uhl',
				roomId: 'room-nb-703',
				timeSlotId: 'day-Saturday-3',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '23B',
				isShared: true,
				sharedWith: 'CSE+EEE+CE'
			},
			
			// SUNDAY 9:30-11:00 - Multiple batches
			{
				id: 'entry-sun-27b-slot0',
				courseId: 'course-phy-1101',
				teacherId: 'teacher-mri',
				roomId: 'room-nb-508',
				timeSlotId: 'day-Sunday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '27B',
				isShared: true,
				sharedWith: 'CSE+EEE+CE'
			},
			{
				id: 'entry-sun-26b-slot0',
				courseId: 'course-eee-1201',
				teacherId: 'teacher-rh',
				roomId: 'room-nb-702',
				timeSlotId: 'day-Sunday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '26B',
				isShared: true,
				sharedWith: 'CSE+EEE'
			},
			{
				id: 'entry-sun-23b-slot0',
				courseId: 'course-cse-4103',
				teacherId: 'teacher-mrk',
				roomId: 'room-nb-407',
				timeSlotId: 'day-Sunday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '23B'
			},
			{
				id: 'entry-sun-22b-slot0',
				courseId: 'course-cse-4201',
				teacherId: 'teacher-rrp',
				roomId: 'room-nb-501',
				timeSlotId: 'day-Sunday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '22B'
			},
			{
				id: 'entry-sun-21b-slot0',
				courseId: 'course-cse-4103',
				teacherId: 'teacher-itm',
				roomId: 'room-nb-502',
				timeSlotId: 'day-Sunday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '21B'
			},
			
			// SUNDAY 11:10-12:40
			{
				id: 'entry-sun-25b-slot1',
				courseId: 'course-cse-1204',
				teacherId: 'teacher-nh',
				roomId: 'room-nb-408',
				timeSlotId: 'day-Sunday-1',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '25B'
			},
			{
				id: 'entry-sun-22b-slot1',
				courseId: 'course-cse-3205',
				teacherId: 'teacher-mbi',
				roomId: 'room-nb-501',
				timeSlotId: 'day-Sunday-1',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '22B'
			},
			
			// SUNDAY 2:00-3:30 PM
			{
				id: 'entry-sun-21b-slot2',
				courseId: 'course-cse-4104',
				teacherId: 'teacher-itm',
				roomId: 'room-nb-408',
				timeSlotId: 'day-Sunday-2',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '21B'
			},
			
			// MONDAY 9:30-11:00 - Multiple batches
			{
				id: 'entry-mon-27b-slot0',
				courseId: 'course-eee-1102',
				teacherId: 'teacher-ric',
				roomId: 'room-nb-608',
				timeSlotId: 'day-Monday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '27B'
			},
			{
				id: 'entry-mon-26b-slot0',
				courseId: 'course-phy-1201',
				teacherId: 'teacher-mra',
				roomId: 'room-nb-508',
				timeSlotId: 'day-Monday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '26B',
				isShared: true,
				sharedWith: 'CSE+EEE+CE'
			},
			{
				id: 'entry-mon-25b-slot0',
				courseId: 'course-mth-2101',
				teacherId: 'teacher-mj',
				roomId: 'room-nb-504',
				timeSlotId: 'day-Monday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '25B',
				isShared: true,
				sharedWith: 'CSE+EEE+CE'
			},
			{
				id: 'entry-mon-23b-slot0',
				courseId: 'course-cse-3205',
				teacherId: 'teacher-mzi',
				roomId: 'room-nb-502',
				timeSlotId: 'day-Monday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '23B'
			},
			{
				id: 'entry-mon-22b-slot0',
				courseId: 'course-cse-3201',
				teacherId: 'teacher-nh',
				roomId: 'room-nb-503',
				timeSlotId: 'day-Monday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '22B'
			},
			{
				id: 'entry-mon-20b-slot0',
				courseId: 'course-cse-4206',
				teacherId: 'teacher-rrp',
				roomId: 'room-nb-408',
				timeSlotId: 'day-Monday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '20B'
			},
			
			// MONDAY 11:10-12:40 - Multiple batches
			{
				id: 'entry-mon-27b-slot1',
				courseId: 'course-eng-1101',
				teacherId: 'teacher-aam',
				roomId: 'room-nb-703',
				timeSlotId: 'day-Monday-1',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '27B',
				isShared: true,
				sharedWith: 'CSE+EEE+CE'
			},
			{
				id: 'entry-mon-26b-slot1',
				courseId: 'course-mth-1201',
				teacherId: 'teacher-mj',
				roomId: 'room-nb-504',
				timeSlotId: 'day-Monday-1',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '26B'
			},
			{
				id: 'entry-mon-25b-slot1',
				courseId: 'course-bus-2201',
				teacherId: 'teacher-ejs',
				roomId: 'room-nb-702',
				timeSlotId: 'day-Monday-1',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '25B',
				isShared: true,
				sharedWith: 'CSE+EEE+CE (with 24B)'
			},
			{
				id: 'entry-mon-22b-slot1',
				courseId: 'course-cse-3206',
				teacherId: 'teacher-mzi',
				roomId: 'room-nb-505',
				timeSlotId: 'day-Monday-1',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '22B'
			},
			
			// TUESDAY 9:30-11:00 - Multiple batches
			{
				id: 'entry-tue-27b-slot0',
				courseId: 'course-eee-1101',
				teacherId: 'teacher-ric',
				roomId: 'room-nb-508',
				timeSlotId: 'day-Tuesday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '27B'
			},
			{
				id: 'entry-tue-26b-slot0',
				courseId: 'course-phy-1201',
				teacherId: 'teacher-mra',
				roomId: 'room-nb-503',
				timeSlotId: 'day-Tuesday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '26B',
				isShared: true,
				sharedWith: 'CSE+EEE+CE'
			},
			{
				id: 'entry-tue-22b-slot0',
				courseId: 'course-cse-3201',
				teacherId: 'teacher-nh',
				roomId: 'room-nb-506',
				timeSlotId: 'day-Tuesday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '22B'
			},
			{
				id: 'entry-tue-21b-slot0',
				courseId: 'course-cse-4205',
				teacherId: 'teacher-rrp',
				roomId: 'room-nb-502',
				timeSlotId: 'day-Tuesday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '21B'
			},
			{
				id: 'entry-tue-20b-slot0',
				courseId: 'course-cse-483',
				teacherId: 'teacher-itm',
				roomId: 'room-nb-504',
				timeSlotId: 'day-Tuesday-0',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '20B'
			},
			
			// TUESDAY 11:10-12:40 - Multiple batches
			{
				id: 'entry-tue-27b-slot1',
				courseId: 'course-cse-3207',
				teacherId: 'teacher-sr',
				roomId: 'room-nb-501',
				timeSlotId: 'day-Tuesday-1',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '27B'
			},
			{
				id: 'entry-tue-22b-slot1',
				courseId: 'course-cse-3204',
				teacherId: 'teacher-mm',
				roomId: 'room-nb-407',
				timeSlotId: 'day-Tuesday-1',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '22B'
			},
			{
				id: 'entry-tue-21b-slot1',
				courseId: 'course-cse-4103',
				teacherId: 'teacher-itm',
				roomId: 'room-nb-503',
				timeSlotId: 'day-Tuesday-1',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '21B'
			},
			{
				id: 'entry-tue-20b-slot1',
				courseId: 'course-cse-453',
				teacherId: 'teacher-fsf',
				roomId: 'room-nb-505',
				timeSlotId: 'day-Tuesday-1',
				departmentId: 'dept-cse',
				semester: 'Summer-2025',
				academicYear: '2025',
				batch: '20B'
			}
		]);

		selectedDepartmentId.set('dept-cse');
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

	// Helper function to get time slot ID for a specific day and time range
	function getTimeSlotIdForCell(day: DayOfWeek, timeRange: string): string {
		const entry = $populatedScheduleEntries.find(entry => 
			entry.timeSlot.day === day && 
			`${entry.timeSlot.startTime}-${entry.timeSlot.endTime}` === timeRange
		);
		if (entry) return entry.timeSlot.id;

		// If no entry exists, find the time slot from all available time slots
		const allTimeSlots: TimeSlot[] = $filteredTimeSlots;
		const matchingSlot = allTimeSlots.find((slot: TimeSlot) => 
			slot.day === day && 
			`${slot.startTime}-${slot.endTime}` === timeRange
		);
		return matchingSlot?.id || '';
	}
</script>

<div class="schedule-container">
	<div class="controls">
		<h2>Class Schedule</h2>
		<div class="filters">
			<select bind:value={$selectedDepartmentId}>
				<option value="">All Departments</option>
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
					{@const timeSlotId = getTimeSlotIdForCell(day, timeRange)}
					<div 
						class="cell schedule-cell"
						role="button"
						tabindex="0"
						ondrop={(e) => timeSlotId && handleDrop(e, timeSlotId)}
						ondragover={handleDragOver}
					>
						{#if entry}
							<div 
								class="schedule-entry"
								class:shared={entry.isShared}
								draggable="true"
								ondragstart={(e) => handleDragStart(e, entry)}
								role="button"
								tabindex="0"
							>
								<div class="course-code">{entry.course.code}</div>
								<div class="course-name">{entry.course.name}</div>
								<div class="teacher-name">{entry.teacher.name}</div>
								<div class="room-name">📍 {entry.room.name}</div>
								{#if entry.batch}
									<div class="batch-info">Batch: {entry.batch}</div>
								{/if}
								{#if entry.isShared}
									<div class="shared-info">🔗 {entry.sharedWith}</div>
								{/if}
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

	.batch-info {
		font-size: 0.75rem;
		opacity: 0.85;
		font-style: italic;
		margin-top: 0.25rem;
		padding-top: 0.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.3);
	}

	.shared-info {
		font-size: 0.75rem;
		opacity: 0.9;
		background: rgba(255, 255, 255, 0.2);
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
		margin-top: 0.25rem;
	}

	.schedule-entry.shared {
		background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
		border: 2px solid rgba(255, 255, 255, 0.5);
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
