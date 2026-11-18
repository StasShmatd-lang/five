export async function readJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) throw new Error(res.ok ? "Пустой ответ сервера" : `Ошибка ${res.status}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.status === 405 || res.status === 404
        ? "API недоступен на этом адресе"
        : res.ok
          ? "Сервер вернул не JSON"
          : `Ошибка ${res.status}`,
    );
  }
}
