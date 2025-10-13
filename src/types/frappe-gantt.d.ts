declare module 'frappe-gantt' {
  export interface GanttOptions {
    header_height?: number
    column_width?: number
    step?: number
    view_modes?: string[]
    bar_height?: number
    bar_corner_radius?: number
    arrow_curve?: number
    padding?: number
    popup_trigger?: string
    date_format?: string
    on_click?: (task: any) => void
    on_date_change?: (task: any, start: Date, end: Date) => void
    on_progress_change?: (task: any, progress: number) => void
    on_view_change?: (mode: string) => void
  }

  export interface GanttTask {
    id: string
    name: string
    start: string
    end: string
    progress: number
    dependencies?: string
    custom_class?: string
    phaseId?: string
    assignees?: string[]
    status?: string
    description?: string
  }

  export class Gantt {
    constructor(element: HTMLElement, tasks: GanttTask[], options?: GanttOptions)
    change_view_mode(mode: string): void
    refresh(tasks: GanttTask[]): void
    destroy(): void
  }
}
