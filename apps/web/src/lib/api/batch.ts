type LoaderMap = Record<string, () => Promise<unknown>>;

export async function loadInBatches<T extends LoaderMap>(
  loaders: T,
  batchSize = 1
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const entries = Object.entries(loaders) as Array<[keyof T, T[keyof T]]>;
  const results = {} as { [K in keyof T]: Awaited<ReturnType<T[K]>> };

  for (let index = 0; index < entries.length; index += batchSize) {
    const batch = entries.slice(index, index + batchSize);
    const values = await Promise.all(batch.map(([, load]) => load()));

    batch.forEach(([key], valueIndex) => {
      (results as Record<keyof T, unknown>)[key] = values[valueIndex];
    });
  }

  return results;
}
