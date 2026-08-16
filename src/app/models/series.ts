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
