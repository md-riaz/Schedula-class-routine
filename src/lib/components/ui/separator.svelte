<script lang="ts">
        import { cn } from '$lib/utils/cn';
        export let className = '';
        export let orientation: 'horizontal' | 'vertical' = 'horizontal';
</script>

<div
        role="separator"
        aria-orientation={orientation}
        class={cn(
                'shrink-0 bg-border',
                orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
                className
        )}
        {...$$restProps}
></div>
