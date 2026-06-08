declare module 'active-win' {
  export interface WindowInfo {
    title: string;
    id: number;
    bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    owner: {
      name: string;
      processId: number;
      path: string;
    };
    memoryUsage?: number;
  }
  
  export default function activeWin(): Promise<WindowInfo | undefined>;
}

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}
