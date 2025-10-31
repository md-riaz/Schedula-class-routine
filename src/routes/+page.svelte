<script lang="ts">
        import { onMount } from 'svelte';
        import type { DayOfWeek, ScheduleEntryPopulated, TimeSlot } from '$lib/types';
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

        let entriesMap: Map<string, ScheduleEntryPopulated> = new Map();
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

        $: entriesMap = new Map(
                $populatedScheduleEntries.map(entry => [
                        `${entry.timeSlot.day}-${entry.timeSlot.startTime}-${entry.timeSlot.endTime}`,
                        entry
                ])
        );

        $: days = Array.from(
                new Set($populatedScheduleEntries.map(entry => entry.timeSlot.day))
        ).sort((a, b) => DAY_ORDER[a] - DAY_ORDER[b]) as DayOfWeek[];

        $: timeRanges = Array.from(
                new Set(
                        $populatedScheduleEntries.map(
                                entry => `${entry.timeSlot.startTime}-${entry.timeSlot.endTime}`
                        )
                )
        ).sort((a, b) => a.localeCompare(b));

        function getEntryForSlot(day: DayOfWeek, timeRange: string) {
                return entriesMap.get(`${day}-${timeRange}`);
        }

        function getTimeSlotIdForCell(day: DayOfWeek, timeRange: string): string {
                const populatedEntry = entriesMap.get(`${day}-${timeRange}`);
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
                if (!Number.isFinite(value)) return 30;
                const clamped = Math.min(Math.max(value, 30), 180);
                return clamped;
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
                                                        <Label for="day-duration-slider">Day shift</Label>
                                                        <div class="space-y-2 rounded-lg border border-border/70 bg-muted/40 p-3">
                                                                <input
                                                                        id="day-duration-slider"
                                                                        class="duration-slider"
                                                                        type="range"
                                                                        min="30"
                                                                        max="180"
                                                                        step="5"
                                                                        bind:value={slotDurations.day}
                                                                        on:input={handleDurationChange}
                                                                />
                                                                <div class="flex items-center gap-2">
                                                                        <Input
                                                                                id="day-duration"
                                                                                type="number"
                                                                                min="30"
                                                                                step="5"
                                                                                bind:value={slotDurations.day}
                                                                                on:input={handleDurationChange}
                                                                        />
                                                                        <span class="w-14 text-right text-xs font-medium text-muted-foreground">{slotDurations.day} min</span>
                                                                </div>
                                                                <div class="flex justify-between text-[11px] text-muted-foreground">
                                                                        <span>30</span>
                                                                        <span>180</span>
                                                                </div>
                                                        </div>
                                                </div>
                                                <div class="space-y-2">
                                                        <Label for="evening-duration-slider">Evening</Label>
                                                        <div class="space-y-2 rounded-lg border border-border/70 bg-muted/40 p-3">
                                                                <input
                                                                        id="evening-duration-slider"
                                                                        class="duration-slider"
                                                                        type="range"
                                                                        min="30"
                                                                        max="180"
                                                                        step="5"
                                                                        bind:value={slotDurations.evening}
                                                                        on:input={handleDurationChange}
                                                                />
                                                                <div class="flex items-center gap-2">
                                                                        <Input
                                                                                id="evening-duration"
                                                                                type="number"
                                                                                min="30"
                                                                                step="5"
                                                                                bind:value={slotDurations.evening}
                                                                                on:input={handleDurationChange}
                                                                        />
                                                                        <span class="w-14 text-right text-xs font-medium text-muted-foreground">{slotDurations.evening} min</span>
                                                                </div>
                                                                <div class="flex justify-between text-[11px] text-muted-foreground">
                                                                        <span>30</span>
                                                                        <span>180</span>
                                                                </div>
                                                        </div>
                                                </div>
                                                <div class="space-y-2">
                                                        <Label for="weekend-duration-slider">Weekend</Label>
                                                        <div class="space-y-2 rounded-lg border border-border/70 bg-muted/40 p-3">
                                                                <input
                                                                        id="weekend-duration-slider"
                                                                        class="duration-slider"
                                                                        type="range"
                                                                        min="30"
                                                                        max="180"
                                                                        step="5"
                                                                        bind:value={slotDurations.weekend}
                                                                        on:input={handleDurationChange}
                                                                />
                                                                <div class="flex items-center gap-2">
                                                                        <Input
                                                                                id="weekend-duration"
                                                                                type="number"
                                                                                min="30"
                                                                                step="5"
                                                                                bind:value={slotDurations.weekend}
                                                                                on:input={handleDurationChange}
                                                                        />
                                                                        <span class="w-14 text-right text-xs font-medium text-muted-foreground">{slotDurations.weekend} min</span>
                                                                </div>
                                                                <div class="flex justify-between text-[11px] text-muted-foreground">
                                                                        <span>30</span>
                                                                        <span>180</span>
                                                                </div>
                                                        </div>
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
