const apiFetch = (path, options) =>
  fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  }).then(async (res) => {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || res.statusText)
    }
    return res.json()
  })

export const get = (path) => apiFetch(path)
export const post = (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) })
export const put = (path, body) => apiFetch(path, { method: 'PUT', body: JSON.stringify(body) })
