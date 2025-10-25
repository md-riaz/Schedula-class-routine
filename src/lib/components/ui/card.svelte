<script lang="ts">
        import { cn } from '$lib/utils/cn';
        export let className = '';
</script>

<div class={cn('rounded-xl border bg-card text-card-foreground shadow', className)} {...$$restProps}>
        <slot />
</div>
