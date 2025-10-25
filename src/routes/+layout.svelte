<script lang="ts">
        import '../app.css';
        import { currentUser } from '$lib/stores';

        let { children } = $props();
</script>

<div class="min-h-screen bg-background text-foreground">
        <header class="border-b bg-card/80 backdrop-blur">
                <div class="container flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                                <h1 class="text-3xl font-bold tracking-tight">Schedula</h1>
                                <p class="text-sm text-muted-foreground">Smart university class routine management</p>
                        </div>
                        <div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                <a href="/" class="font-medium text-foreground transition hover:text-primary">Schedule</a>
                                {#if $currentUser?.role === 'admin'}
                                        <a href="/departments" class="transition hover:text-primary">Departments</a>
                                        <a href="/teachers" class="transition hover:text-primary">Teachers</a>
                                        <a href="/rooms" class="transition hover:text-primary">Rooms</a>
                                        <a href="/courses" class="transition hover:text-primary">Courses</a>
                                {/if}
                                {#if $currentUser}
                                        <span class="rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                                                {$currentUser.name} ({$currentUser.role})
                                        </span>
                                {/if}
                        </div>
                </div>
        </header>

        <main class="container py-10">
                {@render children()}
        </main>

        <footer class="border-t bg-muted/50 py-6 text-center text-sm text-muted-foreground">
                © 2025 Schedula – University Class Routine Management System
        </footer>
</div>
