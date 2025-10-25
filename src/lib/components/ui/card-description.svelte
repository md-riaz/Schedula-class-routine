<script lang="ts">
        import { cn } from '$lib/utils/cn';
        export let className = '';
</script>

<p class={cn('text-sm text-muted-foreground', className)} {...$$restProps}>
        <slot />
</p>
