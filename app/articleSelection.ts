/** A short Sefaria segment ref is unique only within its tractate. */
export function articleForSelection<T extends { tractate:string; ref:string }>(article:T|null, tractate:string, ref:string):T|null {
  return article?.tractate===tractate && article.ref===ref ? article : null;
}

/** Distinguish an absent article from an unavailable or invalid response. */
export async function readArticleResponse<T extends { ref:string }>(response:Response, ref:string):Promise<T|null> {
  if(!response.ok)throw new Error("Не удалось загрузить сохранённый разбор");
  const data=await response.json() as {article?:T|null}|null;
  if(data?.article===null)return null;
  if(!data?.article || data.article.ref!==ref)throw new Error("Получен разбор другой реплики");
  return data.article as T;
}
