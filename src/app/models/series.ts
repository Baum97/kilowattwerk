export interface SeriesPoint {
    value: number;
    timestamp: number;
}

export interface Series {
    points: SeriesPoint[];
}

export interface CategoryValue {
    category: string;
    value: number;
}

export interface DailyRow {
    day: string;
    technology: number;
    energy_mwh: number;
    avg_mw: number;
    max_mw: number;
    min_mw: number;
}