declare module "ml-kmeans" {
  export function kmeans(
    data: number[][],
    k: number,
    options?: any
  ): {
    clusters: number[];
    centroids: { centroid: number[] }[];
    iterations: number;
  };
}