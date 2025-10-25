declare module 'html2canvas' {
        const html2canvas: (...args: any[]) => Promise<HTMLCanvasElement>;
        export default html2canvas;
}

declare module 'jspdf' {
        export default class jsPDF {
                constructor(...args: any[]);
                addImage(...args: any[]): void;
                save(filename?: string): void;
                internal: Record<string, any>;
        }
}

declare module 'tailwind-merge' {
        export function twMerge(...inputs: string[]): string;
}

declare module 'tailwind-variants' {
        export function tv(...args: any[]): any;
        export type VariantProps<T> = any;
}
