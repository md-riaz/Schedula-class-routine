<script lang="ts">
        import { onMount } from 'svelte';
        import html2canvas from 'html2canvas';
        import jsPDF from 'jspdf';
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
        import Card from '$lib/components/ui/card.svelte';
        import CardHeader from '$lib/components/ui/card-header.svelte';
        import CardTitle from '$lib/components/ui/card-title.svelte';
        import CardDescription from '$lib/components/ui/card-description.svelte';
        import CardContent from '$lib/components/ui/card-content.svelte';
        import CardFooter from '$lib/components/ui/card-footer.svelte';
        import Button from '$lib/components/ui/button.svelte';
        import Input from '$lib/components/ui/input.svelte';
        import Label from '$lib/components/ui/label.svelte';
        import Separator from '$lib/components/ui/separator.svelte';

        const DAY_SHIFT_START_TIMES = ['09:30', '11:10', '14:00', '15:30'];
        const EVENING_SHIFT_START_TIMES = ['17:00', '18:30', '20:00'];
        const WEEKEND_SHIFT_START_TIMES = ['09:00', '10:30', '12:00', '14:30', '16:00'];
        const DAY_SHIFT_DAYS: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'];

        const DAY_ORDER: Record<DayOfWeek, number> = {
                Sunday: 0,
                Monday: 1,
                Tuesday: 2,
                Wednesday: 3,
                Thursday: 4,
                Friday: 5,
                Saturday: 6
        };

        let slotDurations = {
                day: 90,
                evening: 90,
                weekend: 90
        };

        let activeTab: 'department' | 'teacher' = 'department';
        let selectedTeacherId = '';
        let scheduleTableEl: HTMLDivElement | null = null;
        let teacherTableEl: HTMLDivElement | null = null;
        let draggedEntry: any = null;

        function refreshTimeSlots() {
                const daySlots = generateTimeSlots('day', {
                        durationMinutes: Number(slotDurations.day),
                        startTimes: DAY_SHIFT_START_TIMES,
                        days: DAY_SHIFT_DAYS
                });
                const eveningSlots = generateTimeSlots('evening', {
                        durationMinutes: Number(slotDurations.evening),
                        startTimes: EVENING_SHIFT_START_TIMES
                });
                const weekendSlots = generateTimeSlots('weekend', {
                        durationMinutes: Number(slotDurations.weekend),
                        startTimes: WEEKEND_SHIFT_START_TIMES
                });

                timeSlots.set([...daySlots, ...eveningSlots, ...weekendSlots]);
        }

        async function exportElementToPdf(element: HTMLElement | null, filename: string) {
                if (!element) return;
                const canvas = await html2canvas(element, {
                        scale: 2,
                        backgroundColor: '#ffffff'
                });
                const image = canvas.toDataURL('image/png');
                const pdf = new jsPDF('landscape', 'mm', 'a4');
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
                const width = canvas.width * ratio;
                const height = canvas.height * ratio;
                pdf.addImage(image, 'PNG', (pageWidth - width) / 2, 10, width, height);
                pdf.save(filename);
        }

        function handleExportAll() {
                exportElementToPdf(
                        scheduleTableEl,
                        `schedula-${$selectedDepartmentId || 'all'}-${$selectedShift}.pdf`
                );
        }

        function handleExportTeacher() {
                const teacher = $teachers.find(t => t.id === selectedTeacherId);
                exportElementToPdf(
                        teacherTableEl,
                        teacher ? `schedula-${teacher.name}.pdf` : 'schedula-teacher.pdf'
                );
        }

        function handleDragStart(event: DragEvent, entry: any) {
                draggedEntry = entry;
                if (event.dataTransfer) {
                        event.dataTransfer.effectAllowed = 'move';
                }
        }

        function handleDrop(event: DragEvent, timeSlotId: string) {
                event.preventDefault();
                if (draggedEntry) {
                        scheduleEntries.update(entries =>
                                entries.map(entry =>
                                        entry.id === draggedEntry.id ? { ...entry, timeSlotId } : entry
                                )
                        );
                        draggedEntry = null;
                }
        }

        function handleDragOver(event: DragEvent) {
                event.preventDefault();
                if (event.dataTransfer) {
                        event.dataTransfer.dropEffect = 'move';
                }
        }

        $: days = Array.from(
                new Set($populatedScheduleEntries.map(entry => entry.timeSlot.day))
        ) as DayOfWeek[];

        $: timeRanges = Array.from(
                new Set(
                        $populatedScheduleEntries.map(
                                entry => `${entry.timeSlot.startTime}-${entry.timeSlot.endTime}`
                        )
                )
        );

        function getEntryForSlot(day: DayOfWeek, timeRange: string) {
                return $populatedScheduleEntries.find(entry =>
                        entry.timeSlot.day === day &&
                        `${entry.timeSlot.startTime}-${entry.timeSlot.endTime}` === timeRange
                );
        }

        function getTimeSlotIdForCell(day: DayOfWeek, timeRange: string): string {
                const populatedEntry = getEntryForSlot(day, timeRange);
                if (populatedEntry) return populatedEntry.timeSlot.id;

                const allTimeSlots: TimeSlot[] = $filteredTimeSlots;
                const [startTime, endTime] = timeRange.split('-');
                const slot = allTimeSlots.find(ts =>
                        ts.day === day && ts.startTime === startTime && ts.endTime === endTime
                );
                return slot?.id ?? '';
        }

        $: teacherOptions = $teachers;
        $: if (!selectedTeacherId && teacherOptions.length) {
                selectedTeacherId = teacherOptions[0].id;
        }

        $: teacherEntries = selectedTeacherId
                ? $populatedScheduleEntries.filter(entry => entry.teacherId === selectedTeacherId)
                : [];

        $: teacherEntriesSorted = [...teacherEntries].sort((a, b) => {
                const dayDiff = DAY_ORDER[a.timeSlot.day] - DAY_ORDER[b.timeSlot.day];
                if (dayDiff !== 0) return dayDiff;
                return a.timeSlot.startTime.localeCompare(b.timeSlot.startTime);
        });

        function formatTimeRange(timeSlot: TimeSlot) {
                return `${timeSlot.startTime} – ${timeSlot.endTime}`;
        }

        function handleTeacherChange(event: Event) {
                const target = event.target as HTMLSelectElement;
                selectedTeacherId = target.value;
        }

        function normalizeDuration(value: number) {
                return Number.isFinite(value) && value >= 15 ? value : 15;
        }

        function handleDurationChange() {
                slotDurations = {
                        day: normalizeDuration(Number(slotDurations.day)),
                        evening: normalizeDuration(Number(slotDurations.evening)),
                        weekend: normalizeDuration(Number(slotDurations.weekend))
                };
                refreshTimeSlots();
        }

        onMount(() => {
                currentUser.set({
                        id: 'user-1',
                        name: 'Admin User',
                        email: 'admin@pust.edu',
                        role: 'admin'
                });

                departments.set([
                        { id: 'dept-cse', name: 'Computer Science & Engineering', code: 'CSE' },
                        { id: 'dept-eee', name: 'Electrical & Electronic Engineering', code: 'EEE' },
                        { id: 'dept-ce', name: 'Civil Engineering', code: 'CE' }
                ]);

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

                courses.set([
                        { id: 'course-eee-1101', name: 'Basic Electrical Engineering', code: 'EEE-1101', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-mat-1101', name: 'Mathematics I', code: 'MAT-1101', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-phy-1101', name: 'Physics I', code: 'PHY-1101', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-eee-1102', name: 'Basic Electrical Engineering Lab', code: 'EEE-1102', departmentId: 'dept-cse', credits: 1, type: 'lab' },
                        { id: 'course-eng-1101', name: 'English I', code: 'ENG-1101', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-mth-1201', name: 'Mathematics II', code: 'MTH-1201', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-cse-1203', name: 'Structured Programming', code: 'CSE-1203', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-eee-1201', name: 'Electrical Circuits', code: 'EEE-1201', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-phy-1201', name: 'Physics II', code: 'PHY-1201', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-cse-1204', name: 'Structured Programming Lab', code: 'CSE-1204', departmentId: 'dept-cse', credits: 1, type: 'lab' },
                        { id: 'course-cse-2105', name: 'Data Structures', code: 'CSE-2105', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-bus-2201', name: 'Business Studies', code: 'BUS-2201', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-mth-2101', name: 'Discrete Mathematics', code: 'MTH-2101', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-cse-2203', name: 'Object Oriented Programming', code: 'CSE-2203', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-lamp-3201', name: 'LAMP Programming', code: 'LAMP-3201', departmentId: 'dept-cse', credits: 3, type: 'practical' },
                        { id: 'course-bus-3101', name: 'Business Communication', code: 'BUS-3101', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-cse-4103', name: 'Software Engineering', code: 'CSE-4103', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-cse-3100', name: 'Algorithm Design', code: 'CSE-3100', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-cse-3103', name: 'Database Systems', code: 'CSE-3103', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-cse-3201', name: 'Computer Architecture', code: 'CSE-3201', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-cse-3205', name: 'Operating Systems', code: 'CSE-3205', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-cse-3204', name: 'Computer Networks', code: 'CSE-3204', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-cse-3206', name: 'Operating Systems Lab', code: 'CSE-3206', departmentId: 'dept-cse', credits: 1, type: 'lab' },
                        { id: 'course-cse-4201', name: 'Compiler Design', code: 'CSE-4201', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-cse-3200', name: 'Microprocessor & Assembly Language', code: 'CSE-3200', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-cse-4104', name: 'Software Engineering Lab', code: 'CSE-4104', departmentId: 'dept-cse', credits: 1, type: 'lab' },
                        { id: 'course-cse-4205', name: 'Artificial Intelligence', code: 'CSE-4205', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-cse-4206', name: 'Machine Learning', code: 'CSE-4206', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-cse-3207', name: 'Web Technologies', code: 'CSE-3207', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-cse-483', name: 'Cloud Computing', code: 'CSE-483', departmentId: 'dept-cse', credits: 3, type: 'theory' },
                        { id: 'course-cse-453', name: 'Cyber Security', code: 'CSE-453', departmentId: 'dept-cse', credits: 3, type: 'theory' }
                ]);

                scheduleEntries.set([
                        { id: 'entry-sat-27b-slot0', courseId: 'course-eee-1101', teacherId: 'teacher-ric', roomId: 'room-nb-508', timeSlotId: 'day-Saturday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '27B' },
                        { id: 'entry-sat-26b-slot0', courseId: 'course-mth-1201', teacherId: 'teacher-mj', roomId: 'room-nb-504', timeSlotId: 'day-Saturday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '26B' },
                        { id: 'entry-sat-23b-slot0', courseId: 'course-cse-2203', teacherId: 'teacher-amar', roomId: 'room-nb-503', timeSlotId: 'day-Saturday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '23B' },
                        { id: 'entry-sat-22b-slot0', courseId: 'course-cse-3100', teacherId: 'teacher-sr', roomId: 'room-nb-406', timeSlotId: 'day-Saturday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '22B' },
                        { id: 'entry-sat-21b-slot0', courseId: 'course-cse-4201', teacherId: 'teacher-rrp', roomId: 'room-nb-408', timeSlotId: 'day-Saturday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '21B' },
                        { id: 'entry-sat-27b-slot1', courseId: 'course-mat-1101', teacherId: 'teacher-mj', roomId: 'room-nb-504', timeSlotId: 'day-Saturday-1', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '27B', isShared: true, sharedWith: 'CSE+EEE+CE' },
                        { id: 'entry-sat-26b-slot1', courseId: 'course-cse-1203', teacherId: 'teacher-nh', roomId: 'room-nb-408', timeSlotId: 'day-Saturday-1', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '26B' },
                        { id: 'entry-sat-25b-slot1', courseId: 'course-cse-2105', teacherId: 'teacher-sr', roomId: 'room-nb-508', timeSlotId: 'day-Saturday-1', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '25B' },
                        { id: 'entry-sat-22b-slot1', courseId: 'course-cse-3103', teacherId: 'teacher-mrk', roomId: 'room-nb-502', timeSlotId: 'day-Saturday-1', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '22B' },
                        { id: 'entry-sat-25b-slot2', courseId: 'course-bus-2201', teacherId: 'teacher-ejs', roomId: 'room-nb-703', timeSlotId: 'day-Saturday-2', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '25B', isShared: true, sharedWith: 'CSE+EEE+CE (with 24B)' },
                        { id: 'entry-sat-23b-slot2', courseId: 'course-lamp-3201', teacherId: 'teacher-jh', roomId: 'room-nb-508', timeSlotId: 'day-Saturday-2', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '23B' },
                        { id: 'entry-sat-21b-slot2', courseId: 'course-cse-3200', teacherId: 'teacher-mbi', roomId: 'room-nb-407', timeSlotId: 'day-Saturday-2', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '21B' },
                        { id: 'entry-sat-23b-slot3', courseId: 'course-bus-3101', teacherId: 'teacher-uhl', roomId: 'room-nb-703', timeSlotId: 'day-Saturday-3', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '23B', isShared: true, sharedWith: 'CSE+EEE+CE' },
                        { id: 'entry-sun-27b-slot0', courseId: 'course-phy-1101', teacherId: 'teacher-mri', roomId: 'room-nb-508', timeSlotId: 'day-Sunday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '27B', isShared: true, sharedWith: 'CSE+EEE+CE' },
                        { id: 'entry-sun-26b-slot0', courseId: 'course-eee-1201', teacherId: 'teacher-rh', roomId: 'room-nb-702', timeSlotId: 'day-Sunday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '26B', isShared: true, sharedWith: 'CSE+EEE' },
                        { id: 'entry-sun-23b-slot0', courseId: 'course-cse-4103', teacherId: 'teacher-mrk', roomId: 'room-nb-407', timeSlotId: 'day-Sunday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '23B' },
                        { id: 'entry-sun-22b-slot0', courseId: 'course-cse-4201', teacherId: 'teacher-rrp', roomId: 'room-nb-501', timeSlotId: 'day-Sunday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '22B' },
                        { id: 'entry-sun-21b-slot0', courseId: 'course-cse-4103', teacherId: 'teacher-itm', roomId: 'room-nb-502', timeSlotId: 'day-Sunday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '21B' },
                        { id: 'entry-sun-25b-slot1', courseId: 'course-cse-1204', teacherId: 'teacher-nh', roomId: 'room-nb-408', timeSlotId: 'day-Sunday-1', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '25B' },
                        { id: 'entry-sun-22b-slot1', courseId: 'course-cse-3205', teacherId: 'teacher-mbi', roomId: 'room-nb-501', timeSlotId: 'day-Sunday-1', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '22B' },
                        { id: 'entry-sun-21b-slot2', courseId: 'course-cse-4104', teacherId: 'teacher-itm', roomId: 'room-nb-408', timeSlotId: 'day-Sunday-2', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '21B' },
                        { id: 'entry-mon-27b-slot0', courseId: 'course-eee-1102', teacherId: 'teacher-ric', roomId: 'room-nb-608', timeSlotId: 'day-Monday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '27B' },
                        { id: 'entry-mon-26b-slot0', courseId: 'course-phy-1201', teacherId: 'teacher-mra', roomId: 'room-nb-508', timeSlotId: 'day-Monday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '26B', isShared: true, sharedWith: 'CSE+EEE+CE' },
                        { id: 'entry-mon-25b-slot0', courseId: 'course-mth-2101', teacherId: 'teacher-mj', roomId: 'room-nb-504', timeSlotId: 'day-Monday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '25B' },
                        { id: 'entry-mon-22b-slot1', courseId: 'course-cse-3206', teacherId: 'teacher-mzi', roomId: 'room-nb-505', timeSlotId: 'day-Monday-1', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '22B' },
                        { id: 'entry-tue-27b-slot0', courseId: 'course-eee-1101', teacherId: 'teacher-ric', roomId: 'room-nb-508', timeSlotId: 'day-Tuesday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '27B' },
                        { id: 'entry-tue-26b-slot0', courseId: 'course-phy-1201', teacherId: 'teacher-mra', roomId: 'room-nb-503', timeSlotId: 'day-Tuesday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '26B', isShared: true, sharedWith: 'CSE+EEE+CE' },
                        { id: 'entry-tue-22b-slot0', courseId: 'course-cse-3201', teacherId: 'teacher-nh', roomId: 'room-nb-506', timeSlotId: 'day-Tuesday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '22B' },
                        { id: 'entry-tue-21b-slot0', courseId: 'course-cse-4205', teacherId: 'teacher-rrp', roomId: 'room-nb-502', timeSlotId: 'day-Tuesday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '21B' },
                        { id: 'entry-tue-20b-slot0', courseId: 'course-cse-483', teacherId: 'teacher-itm', roomId: 'room-nb-504', timeSlotId: 'day-Tuesday-0', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '20B' },
                        { id: 'entry-tue-27b-slot1', courseId: 'course-cse-3207', teacherId: 'teacher-sr', roomId: 'room-nb-501', timeSlotId: 'day-Tuesday-1', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '27B' },
                        { id: 'entry-tue-22b-slot1', courseId: 'course-cse-3204', teacherId: 'teacher-mm', roomId: 'room-nb-407', timeSlotId: 'day-Tuesday-1', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '22B' },
                        { id: 'entry-tue-21b-slot1', courseId: 'course-cse-4103', teacherId: 'teacher-itm', roomId: 'room-nb-503', timeSlotId: 'day-Tuesday-1', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '21B' },
                        { id: 'entry-tue-20b-slot1', courseId: 'course-cse-453', teacherId: 'teacher-fsf', roomId: 'room-nb-505', timeSlotId: 'day-Tuesday-1', departmentId: 'dept-cse', semester: 'Summer-2025', academicYear: '2025', batch: '20B' }
                ]);

                selectedDepartmentId.set('dept-cse');
                selectedShift.set('day');

                refreshTimeSlots();
        });
</script>

<div class="space-y-8">
        <Card>
                <CardHeader>
                        <CardTitle>Routine controls</CardTitle>
                        <CardDescription>Filter the routine, tweak time slots and export PDF copies.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                        <div class="grid gap-6 md:grid-cols-2">
                                <div class="space-y-3">
                                        <div>
                                                <Label for="department">Department</Label>
                                                <select
                                                        id="department"
                                                        class="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                        bind:value={$selectedDepartmentId}
                                                >
                                                        <option value="">All departments</option>
                                                        {#each $departments as dept}
                                                                <option value={dept.id}>{dept.name}</option>
                                                        {/each}
                                                </select>
                                        </div>
                                        <div>
                                                <Label for="shift">Shift</Label>
                                                <select
                                                        id="shift"
                                                        class="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                        bind:value={$selectedShift}
                                                >
                                                        <option value="all">All shifts</option>
                                                        <option value="day">Day</option>
                                                        <option value="evening">Evening</option>
                                                        <option value="weekend">Weekend</option>
                                                </select>
                                        </div>
                                </div>
                                <div class="space-y-4">
                                        <p class="text-sm font-medium text-muted-foreground">Adjust slot duration (minutes)</p>
                                        <div class="grid gap-3 sm:grid-cols-3">
                                                <div class="space-y-2">
                                                        <Label for="day-duration">Day shift</Label>
                                                        <Input
                                                                id="day-duration"
                                                                type="number"
                                                                min="30"
                                                                step="5"
                                                                bind:value={slotDurations.day}
                                                                on:change={handleDurationChange}
                                                        />
                                                </div>
                                                <div class="space-y-2">
                                                        <Label for="evening-duration">Evening</Label>
                                                        <Input
                                                                id="evening-duration"
                                                                type="number"
                                                                min="30"
                                                                step="5"
                                                                bind:value={slotDurations.evening}
                                                                on:change={handleDurationChange}
                                                        />
                                                </div>
                                                <div class="space-y-2">
                                                        <Label for="weekend-duration">Weekend</Label>
                                                        <Input
                                                                id="weekend-duration"
                                                                type="number"
                                                                min="30"
                                                                step="5"
                                                                bind:value={slotDurations.weekend}
                                                                on:change={handleDurationChange}
                                                        />
                                                </div>
                                        </div>
                                        <p class="text-xs text-muted-foreground">Slot end times are recomputed instantly using the supplied duration.</p>
                                </div>
                        </div>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-3">
                        <Button on:click={handleExportAll}>Export full routine</Button>
                        <Button
                                variant={activeTab === 'teacher' ? 'secondary' : 'outline'}
                                on:click={() => (activeTab = activeTab === 'teacher' ? 'department' : 'teacher')}
                        >
                                {activeTab === 'teacher' ? 'Back to department view' : 'Switch to teacher view'}
                        </Button>
                </CardFooter>
        </Card>

        {#if !$validationResult.valid}
                <Card className="border-destructive/40 bg-destructive/10 text-destructive">
                        <CardHeader className="pb-3">
                                <CardTitle className="text-destructive">Schedule conflicts detected</CardTitle>
                                <CardDescription className="text-destructive">Resolve the issues below to stabilise the routine.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                                {#each $validationResult.conflicts as conflict}
                                        <p>• {conflict.message}</p>
                                {/each}
                        </CardContent>
                </Card>
        {:else}
                <div class="rounded-lg border border-emerald-400/60 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        ✓ No conflicts detected – the current timetable is valid.
                </div>
        {/if}

        <div class="inline-flex items-center gap-2 rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                <span class="uppercase tracking-wide text-[11px]">View</span>
                <button
                        type="button"
                        class={`rounded-full px-3 py-1 transition ${activeTab === 'department' ? 'bg-primary text-primary-foreground shadow' : 'hover:text-foreground'}`}
                        on:click={() => (activeTab = 'department')}
                >
                        Department routine
                </button>
                <button
                        type="button"
                        class={`rounded-full px-3 py-1 transition ${activeTab === 'teacher' ? 'bg-primary text-primary-foreground shadow' : 'hover:text-foreground'}`}
                        on:click={() => (activeTab = 'teacher')}
                >
                        Teacher routine
                </button>
        </div>

        {#if activeTab === 'department'}
                <div bind:this={scheduleTableEl}>
                        <Card className="shadow-sm">
                        <CardHeader className="pb-4">
                                <CardTitle>Department timetable</CardTitle>
                                <CardDescription className="flex flex-wrap gap-2 text-muted-foreground">
                                        <span>Department: {$selectedDepartmentId ? $departments.find(d => d.id === $selectedDepartmentId)?.name ?? 'All' : 'All'}</span>
                                        <Separator orientation="vertical" className="hidden h-4 sm:inline" />
                                        <span>Shift filter: {$selectedShift}</span>
                                </CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                                <div class="min-w-[900px] overflow-hidden rounded-xl border">
                                        <table class="w-full border-collapse text-sm">
                                                <thead class="bg-muted/70">
                                                        <tr>
                                                                <th class="w-48 border-b border-r px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                                        Time
                                                                </th>
                                                                {#each days as day}
                                                                        <th class="border-b border-r px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                                                {day}
                                                                        </th>
                                                                {/each}
                                                        </tr>
                                                </thead>
                                                <tbody>
                                                        {#each timeRanges as timeRange}
                                                                <tr class="odd:bg-background even:bg-muted/30">
                                                                        <td class="border-b border-r px-4 py-4 font-medium text-foreground">{timeRange.replace('-', ' – ')}</td>
                                                                        {#each days as day}
                                                                                {@const entry = getEntryForSlot(day, timeRange)}
                                                                                {@const timeSlotId = getTimeSlotIdForCell(day, timeRange)}
                                                                                <td
                                                                                        class="border-b border-r align-top"
                                                                                        on:dragover={handleDragOver}
                                                                                        on:drop={(event) => handleDrop(event, timeSlotId)}
                                                                                >
                                                                                        {#if entry}
                                                                                                <div
                                                                                                        class={`group flex min-h-[130px] cursor-move flex-col gap-2 rounded-lg border border-primary/30 bg-primary/90 p-3 text-primary-foreground shadow-sm transition hover:shadow-md ${entry.isShared ? 'bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white' : ''}`}
                                                                                                        draggable
                                                                                                        on:dragstart={(event) => handleDragStart(event, entry)}
                                                                                                        role="button"
                                                                                                        tabindex="0"
                                                                                               >
                                                                                                        <div class="flex items-start justify-between gap-3">
                                                                                                                <div>
                                                                                                                        <p class="text-xs uppercase tracking-widest opacity-80">{entry.course.code}</p>
                                                                                                                        <p class="text-sm font-semibold leading-snug">{entry.course.name}</p>
                                                                                                                </div>
                                                                                                                <span class="rounded-md bg-white/20 px-2 py-1 text-[11px] font-medium uppercase tracking-wide">
                                                                                                                        {entry.batch}
                                                                                                                </span>
                                                                                                        </div>
                                                                                                        <div class="space-y-1 text-xs opacity-90">
                                                                                                                <p class="font-medium">👩‍🏫 {entry.teacher.name}</p>
                                                                                                                <p>🏛️ {entry.room.name}</p>
                                                                                                                <p>⏰ {entry.timeSlot.startTime} – {entry.timeSlot.endTime}</p>
                                                                                                                {#if entry.isShared && entry.sharedWith}
                                                                                                                        <p class="rounded bg-white/20 px-2 py-1 text-[11px] uppercase tracking-wide">Shared with {entry.sharedWith}</p>
                                                                                                                {/if}
                                                                                                        </div>
                                                                                                </div>
                                                                                        {:else if timeSlotId}
                                                                                                <div class="min-h-[130px] rounded-lg border border-dashed border-muted-foreground/40 bg-background/30 p-3 text-center text-xs text-muted-foreground">
                                                                                                        Drop a course here
                                                                                                </div>
                                                                                        {/if}
                                                                                </td>
                                                                        {/each}
                                                                </tr>
                                                        {/each}
                                                </tbody>
                                        </table>
                                </div>
                        </CardContent>
                        </Card>
                </div>
        {:else}
                <div bind:this={teacherTableEl}>
                        <Card className="shadow-sm">
                        <CardHeader className="pb-4">
                                <CardTitle>Teacher routine overview</CardTitle>
                                <CardDescription>Focus on a single teacher’s schedule and export their PDF copy.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                                <div class="grid gap-4 sm:grid-cols-2">
                                        <div>
                                                <Label for="teacher">Teacher</Label>
                                                <select
                                                        id="teacher"
                                                        class="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                        on:change={handleTeacherChange}
                                                        bind:value={selectedTeacherId}
                                                >
                                                        {#each teacherOptions as teacher}
                                                                <option value={teacher.id}>{teacher.name}</option>
                                                        {/each}
                                                </select>
                                        </div>
                                        <div class="flex items-end">
                                                <Button className="w-full sm:w-auto" on:click={handleExportTeacher} disabled={!teacherEntries.length}>
                                                        Export teacher routine
                                                </Button>
                                        </div>
                                </div>
                                <Separator />
                                {#if teacherEntriesSorted.length}
                                        <div class="overflow-hidden rounded-xl border">
                                                <table class="w-full border-collapse text-sm">
                                                        <thead class="bg-muted/70">
                                                                <tr>
                                                                        <th class="w-1/4 border-b border-r px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Day</th>
                                                                        <th class="w-1/4 border-b border-r px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time</th>
                                                                        <th class="border-b border-r px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Course</th>
                                                                        <th class="border-b px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Room</th>
                                                                </tr>
                                                        </thead>
                                                        <tbody>
                                                                {#each teacherEntriesSorted as entry}
                                                                        <tr class="odd:bg-background even:bg-muted/30">
                                                                                <td class="border-b border-r px-4 py-3 font-medium text-foreground">{entry.timeSlot.day}</td>
                                                                                <td class="border-b border-r px-4 py-3 text-muted-foreground">{formatTimeRange(entry.timeSlot)}</td>
                                                                                <td class="border-b border-r px-4 py-3">
                                                                                        <p class="font-medium text-foreground">{entry.course.name}</p>
                                                                                        <p class="text-xs uppercase tracking-wide text-muted-foreground">{entry.course.code} · Batch {entry.batch}</p>
                                                                                </td>
                                                                                <td class="border-b px-4 py-3 text-muted-foreground">{entry.room.name}</td>
                                                                        </tr>
                                                                {/each}
                                                        </tbody>
                                                </table>
                                        </div>
                                {:else}
                                        <p class="text-sm text-muted-foreground">No sessions scheduled for the selected teacher.</p>
                                {/if}
                        </CardContent>
                        </Card>
                </div>
        {/if}
</div>
