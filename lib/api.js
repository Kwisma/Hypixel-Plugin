import fetch from "node-fetch"

async function getJson(url, options) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`)
    error.status = response.status
    throw error
  }

  return response.json()
}

export async function resolveUuid(playerName) {
  if (
    /^(?:[a-f\d]{32}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})$/i.test(
      playerName,
    )
  )
    return playerName.replaceAll("-", "")

  const profile = await getJson(
    `https://api.minecraftservices.com/minecraft/profile/lookup/name/${encodeURIComponent(playerName)}`,
  )
  if (!profile.id) throw new Error(`找不到 Minecraft 玩家「${playerName}」`)
  return profile.id
}

export function getPlayerStats(uuid, apiKey) {
  return getJson(
    `https://api.hypixel.net/v2/player?uuid=${encodeURIComponent(uuid)}`,
    { headers: { "API-Key": apiKey } },
  )
}

export function getApiError(error, context) {
  if (error.status === 404 && context === "Minecraft 玩家查询")
    return "找不到该 Minecraft 玩家，请检查玩家名是否正确"
  if (error.status === 403)
    return "Hypixel API Key 无效或无权访问，请检查插件目录下的 config.yaml"
  if (error.status === 429)
    return "Hypixel API 请求频率已达上限，请稍后再试"
  if (error.status)
    return `${context}请求失败（HTTP ${error.status}）`
  if (error.name === "TimeoutError" || error.name === "AbortError")
    return `${context}请求超时，请稍后再试`
  if (error.message?.startsWith("找不到 Minecraft 玩家"))
    return error.message
  return `${context}请求失败：${error.message}`
}
