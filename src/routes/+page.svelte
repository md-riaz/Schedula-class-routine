<script lang="ts">
        import { onMount } from 'svelte';
        import type { DayOfWeek, ScheduleEntryPopulated, Shift, TimeSlot } from '$lib/types';
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
        import {
                seedCourses,
                seedDepartments,
                seedRooms,
                seedScheduleEntries,
                seedTeachers
        } from '$lib/data/seed';
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
        const EVENING_SHIFT_DAYS: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
        const WEEKEND_SHIFT_DAYS: DayOfWeek[] = ['Friday', 'Saturday'];

        const SHIFT_KEYS: Shift[] = ['day', 'evening', 'weekend'];
        const SHIFT_START_TIMES: Record<Shift, string[]> = {
                day: DAY_SHIFT_START_TIMES,
                evening: EVENING_SHIFT_START_TIMES,
                weekend: WEEKEND_SHIFT_START_TIMES
        };
        const SHIFT_DAYS: Record<Shift, DayOfWeek[]> = {
                day: DAY_SHIFT_DAYS,
                evening: EVENING_SHIFT_DAYS,
                weekend: WEEKEND_SHIFT_DAYS
        };
        const SHIFT_ORDER: Record<Shift, number> = {
                day: 0,
                evening: 1,
                weekend: 2
        };

        const DAY_ORDER: Record<DayOfWeek, number> = {
                Sunday: 0,
                Monday: 1,
                Tuesday: 2,
                Wednesday: 3,
                Thursday: 4,
                Friday: 5,
                Saturday: 6
        };

        const DEFAULT_DURATION = 90;

        type SlotDurations = Record<Shift, Record<string, number>>;

        function buildInitialSlotDurations(): SlotDurations {
                return SHIFT_KEYS.reduce<SlotDurations>((acc, shift) => {
                        acc[shift] = Object.fromEntries(
                                SHIFT_START_TIMES[shift].map(startTime => [startTime, DEFAULT_DURATION])
                        );
                        return acc;
                }, { day: {}, evening: {}, weekend: {} } as SlotDurations);
        }

        let slotDurations: SlotDurations = buildInitialSlotDurations();

        let activeTab: 'department' | 'teacher' = 'department';
        let selectedTeacherId = '';
        let scheduleTableEl: HTMLDivElement | null = null;
        let teacherTableEl: HTMLDivElement | null = null;
        let draggedEntry: any = null;

        let entriesMap: Map<string, ScheduleEntryPopulated> = new Map();
        let timeSlotLookup: Map<string, TimeSlot> = new Map();
        let html2canvasLib: typeof import('html2canvas')['default'] | null = null;
        let jsPDFLib: typeof import('jspdf')['default'] | null = null;

        async function ensurePdfLibraries() {
                if (html2canvasLib && jsPDFLib) return;

                const [{ default: html2canvasModule }, { default: jsPDFModule }] = await Promise.all([
                        import('html2canvas'),
                        import('jspdf')
                ]);

                html2canvasLib = html2canvasModule;
                jsPDFLib = jsPDFModule;
        }

        function addMinutes(time: string, minutes: number): string {
                const [hour, minute] = time.split(':').map(Number);
                const totalMinutes = hour * 60 + minute + minutes;
                const newHours = Math.floor(totalMinutes / 60) % 24;
                const newMinutes = totalMinutes % 60;
                return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
        }

        function refreshTimeSlots() {
                const combinedSlots: TimeSlot[] = [];

                SHIFT_KEYS.forEach(shift => {
                        const startTimes = SHIFT_START_TIMES[shift];
                        const days = SHIFT_DAYS[shift];

                        days.forEach(day => {
                                startTimes.forEach((startTime, index) => {
                                        const duration = slotDurations[shift][startTime] ?? DEFAULT_DURATION;
                                        combinedSlots.push({
                                                id: `${shift}-${day}-${index}`,
                                                day,
                                                startTime,
                                                endTime: addMinutes(startTime, duration),
                                                shift
                                        });
                                });
                        });
                });

                timeSlots.set(combinedSlots);
        }

        async function exportElementToPdf(element: HTMLElement | null, filename: string) {
                if (!element) return;

                await ensurePdfLibraries();
                const html2canvas = html2canvasLib;
                const jsPDFConstructor = jsPDFLib;

                if (!html2canvas || !jsPDFConstructor) return;

                const canvas = await html2canvas(element, {
                        scale: 2,
                        backgroundColor: '#ffffff'
                });
                const image = canvas.toDataURL('image/png');
                const pdf = new jsPDFConstructor('landscape', 'mm', 'a4');
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
                if (!timeSlotId) return;
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

        function getColumnKey(shift: Shift, startTime: string) {
                return `${shift}-${startTime}`;
        }

        function timeToMinutes(time: string) {
                const [hour, minute] = time.split(':').map(Number);
                return hour * 60 + minute;
        }

        function getDurationForSlot(shift: Shift, startTime: string) {
                return slotDurations[shift][startTime] ?? DEFAULT_DURATION;
        }

        $: entriesMap = new Map($populatedScheduleEntries.map(entry => [entry.timeSlotId, entry]));

        $: timeSlotLookup = new Map(
                $filteredTimeSlots.map(slot => [
                        `${slot.day}-${getColumnKey(slot.shift, slot.startTime)}`,
                        slot
                ])
        );

        $: days = Array.from(new Set($filteredTimeSlots.map(slot => slot.day))).sort(
                (a, b) => DAY_ORDER[a] - DAY_ORDER[b]
        ) as DayOfWeek[];

        type ColumnDefinition = {
                key: string;
                shift: Shift;
                startTime: string;
                endTime: string;
                duration: number;
        };

        $: columnDefinitions = (() => {
                const map = new Map<string, ColumnDefinition>();

                $filteredTimeSlots.forEach(slot => {
                        const key = getColumnKey(slot.shift, slot.startTime);
                        const existing = map.get(key);

                        if (existing) {
                                existing.endTime = slot.endTime;
                        } else {
                                map.set(key, {
                                        key,
                                        shift: slot.shift,
                                        startTime: slot.startTime,
                                        endTime: slot.endTime,
                                        duration: getDurationForSlot(slot.shift, slot.startTime)
                                });
                        }
                });

                return Array.from(map.values()).sort((a, b) => {
                        const shiftDiff = SHIFT_ORDER[a.shift] - SHIFT_ORDER[b.shift];
                        if (shiftDiff !== 0) return shiftDiff;
                        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
                });
        })();

        function getEntryForCell(day: DayOfWeek, columnKey: string) {
                const slot = timeSlotLookup.get(`${day}-${columnKey}`);
                if (!slot) return null;
                return entriesMap.get(slot.id) ?? null;
        }

        function getTimeSlotIdForCell(day: DayOfWeek, columnKey: string): string {
                const slot = timeSlotLookup.get(`${day}-${columnKey}`);
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
                const MIN_DURATION = 30;
                const MAX_DURATION = 240;

                if (!Number.isFinite(value)) return MIN_DURATION;

                return Math.min(Math.max(value, MIN_DURATION), MAX_DURATION);
        }

        function handleSlotDurationInput(shift: Shift, startTime: string, value: number) {
                const normalized = normalizeDuration(value);

                slotDurations = {
                        ...slotDurations,
                        [shift]: {
                                ...slotDurations[shift],
                                [startTime]: normalized
                        }
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

                departments.set(seedDepartments);
                teachers.set(seedTeachers);
                rooms.set(seedRooms);
                courses.set(seedCourses);

                refreshTimeSlots();
                scheduleEntries.set(seedScheduleEntries);

                selectedDepartmentId.set('dept-cse');
                selectedShift.set('day');
        });
</script>

<div class="space-y-8">
        <Card>
                <CardHeader>
                        <CardTitle>Routine controls</CardTitle>
                        <CardDescription>Filter the routine, tweak time slots and export PDF copies.</CardDescription>
                </CardHeader>
                <CardContent class="space-y-6">
                        <div class="grid gap-6 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
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
                                <div class="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-4 text-sm text-muted-foreground">
                                        <p class="font-medium text-foreground">
                                                Adjust each slot directly in the timetable header.
                                        </p>
                                        <p class="mt-2">
                                                Drag the slider above any time column (30–240 min) or type a value to extend or
                                                shrink that specific session—perfect for subjects that need two hours or more.
                                        </p>
                                        <p class="mt-2 text-xs uppercase tracking-wide text-muted-foreground/80">
                                                Changes update instantly for every day that uses the slot.
                                        </p>
                                </div>
                        </div>
                </CardContent>
                <CardFooter class="flex flex-wrap gap-3">
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
                <Card class="border-destructive/40 bg-destructive/10 text-destructive">
                        <CardHeader class="pb-3">
                                <CardTitle class="text-destructive">Schedule conflicts detected</CardTitle>
                                <CardDescription class="text-destructive">Resolve the issues below to stabilise the routine.</CardDescription>
                        </CardHeader>
                        <CardContent class="space-y-2 text-sm">
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
                        <Card class="shadow-sm">
                                <CardHeader class="pb-4">
                                        <CardTitle>Department timetable</CardTitle>
                                        <CardDescription class="flex flex-wrap items-center gap-2 text-muted-foreground">
                                                <span>Department: {$selectedDepartmentId ? $departments.find(d => d.id === $selectedDepartmentId)?.name ?? 'All' : 'All'}</span>
                                                <span class="hidden text-muted-foreground sm:inline">•</span>
                                                <span>Shift filter: {$selectedShift}</span>
                                        </CardDescription>
                                </CardHeader>
                                <CardContent class="overflow-x-auto">
                                        <div class="min-w-[900px] overflow-hidden rounded-xl border">
                                                <table class="w-full border-collapse text-sm">
                                                        <thead class="bg-muted/70">
                                                                <tr>
                                                                <th class="w-44 border-b border-r px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                                        Day
                                                                </th>
                                                                {#each columnDefinitions as column}
                                                                        <th class="border-b border-r px-4 py-3 align-top text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                                                <div class="space-y-2">
                                                                                        <div class="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                                                                                                <span>{column.shift}</span>
                                                                                                <span>{column.startTime} – {column.endTime}</span>
                                                                                        </div>
                                                                                        <div class="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                                                                <Input
                                                                                                        aria-label={`Duration for ${column.shift} slot starting at ${column.startTime}`}
                                                                                                        class="h-8 w-20 text-right text-xs"
                                                                                                        min="30"
                                                                                                        max="240"
                                                                                                        step="5"
                                                                                                        type="number"
                                                                                                        value={slotDurations[column.shift][column.startTime]}
                                                                                                        on:input={(event) =>
                                                                                                                handleSlotDurationInput(
                                                                                                                        column.shift,
                                                                                                                        column.startTime,
                                                                                                                        Number((event.target as HTMLInputElement).value)
                                                                                                                )
                                                                                                        }
                                                                                                />
                                                                                                <span>min</span>
                                                                                        </div>
                                                                                        <input
                                                                                                aria-label={`Drag to adjust the ${column.shift} slot starting at ${column.startTime}`}
                                                                                                class="w-full cursor-pointer"
                                                                                                max="240"
                                                                                                min="30"
                                                                                                step="5"
                                                                                                style="accent-color: hsl(var(--primary));"
                                                                                                type="range"
                                                                                                value={slotDurations[column.shift][column.startTime]}
                                                                                                on:input={(event) =>
                                                                                                        handleSlotDurationInput(
                                                                                                                column.shift,
                                                                                                                column.startTime,
                                                                                                                Number((event.target as HTMLInputElement).value)
                                                                                                        )
                                                                                                }
                                                                                        />
                                                                                </div>
                                                                        </th>
                                                                {/each}
                                                        </tr>
                                                </thead>
                                                <tbody>
                                                        {#each days as day}
                                                                <tr class="odd:bg-background even:bg-muted/30">
                                                                        <th scope="row" class="border-b border-r bg-muted/40 px-4 py-4 text-left text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                                                                {day}
                                                                        </th>
                                                                        {#each columnDefinitions as column}
                                                                                {@const entry = getEntryForCell(day, column.key)}
                                                                                {@const timeSlotId = getTimeSlotIdForCell(day, column.key)}
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
                        <Card class="shadow-sm">
                                <CardHeader class="pb-4">
                                        <CardTitle>Teacher routine overview</CardTitle>
                                        <CardDescription>Focus on a single teacher’s schedule and export their PDF copy.</CardDescription>
                                </CardHeader>
                                <CardContent class="space-y-5">
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
                                                        <Button class="w-full sm:w-auto" on:click={handleExportTeacher} disabled={!teacherEntries.length}>
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
