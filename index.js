import fs from "node:fs/promises"
import YAML from "yaml"
import { getApiError, getPlayerStats, resolveUuid } from "./lib/api.js"
import { formatZombiesReport, getZombiesSelection } from "./lib/zombies.js"

const configUrl = new URL("./config.yaml", import.meta.url)

async function loadConfig() {
  let configText
  let created = false
  try {
    configText = await fs.readFile(configUrl, "utf8")
  } catch (error) {
    if (error.code !== "ENOENT") throw error

    try {
      await fs.writeFile(configUrl, 'apiKey: ""\n', { flag: "wx" })
      configText = 'apiKey: ""\n'
      created = true
    } catch (writeError) {
      if (writeError.code !== "EEXIST") throw writeError
      configText = await fs.readFile(configUrl, "utf8")
    }
  }

  return { config: YAML.parse(configText), created }
}

async function readCachedPlayer(cacheUrl) {
  try {
    const cached = JSON.parse(await fs.readFile(cacheUrl, "utf8"))
    if (cached?.success && cached.player && typeof cached.player === "object") return cached
    logger.warn(`[Hypixel] 缓存数据无有效玩家信息：${cacheUrl}`)
  } catch (error) {
    if (error.code !== "ENOENT") logger.error(`[Hypixel] 读取玩家缓存失败：${error}`)
  }

  return undefined
}

export class Hypixel extends plugin {
  constructor() {
    super({
      name: "Hypixel 查询",
      dsc: "#hyp <玩家> zb [模式/难度]",
      event: "message",
      priority: 100,
      rule: [
        {
          reg: "^#hyp(?:ixel)?(?:\\s|$)",
          fnc: "query",
        },
      ],
    })
  }

  async query() {
    const args = this.e.msg
      .replace(/^#hyp(?:ixel)?/i, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    const commandIndex = args.findIndex(arg => arg.toLowerCase() === "zb")

    if (commandIndex < 0)
      return this.reply("用法：#hyp <玩家名或UUID> zb [de|bb|aa|pr|den|deh|der 等]")

    const remaining = [...args]
    remaining.splice(commandIndex, 1)
    const subcommand = remaining[commandIndex]?.toLowerCase()
    const selection = getZombiesSelection(subcommand)
    if (subcommand && selection) remaining.splice(commandIndex, 1)

    if (remaining.length !== 1)
      return this.reply(
        "请提供一个玩家名或UUID。用法：#hyp <玩家名或UUID> zb [de|bb|aa|pr|den|deh|der 等]",
      )

    const playerName = remaining[0]
    let config
    let configCreated
    try {
      const loaded = await loadConfig()
      config = loaded.config
      configCreated = loaded.created
    } catch (error) {
      logger.error(`[Hypixel] 读取插件配置失败：${error}`)
      return this.reply("读取配置文件失败，请检查文件是否存在且格式正确")
    }
    const apiKey = config?.apiKey
    if (typeof apiKey !== "string" || !apiKey.trim())
      return this.reply(
        configCreated
          ? "已初始化 config.yaml，请将 Hypixel API Key 填写到 apiKey 项后重试"
          : "尚未配置 Hypixel API Key，请将密钥填写到 config.yaml 的 apiKey 项",
      )

    let uuid
    try {
      uuid = await resolveUuid(playerName)
    } catch (error) {
      logger.error(`[Hypixel] 解析玩家 UUID 失败：${error}`)
      return this.reply(getApiError(error, "Minecraft 玩家查询"))
    }

    const cacheUrl = new URL(`./cache/${uuid.toLowerCase()}.json`, import.meta.url)
    try {
      await fs.mkdir(new URL("./cache/", import.meta.url), { recursive: true })
    } catch (error) {
      logger.error(`[Hypixel] 创建缓存目录失败：${error}`)
      return this.reply("初始化玩家数据缓存目录失败")
    }

    let data
    let apiFailure
    let apiFailureReply
    try {
      const response = await getPlayerStats(uuid, apiKey.trim())
      if (!response?.success) {
        apiFailureReply = `Hypixel API 查询失败：${response?.cause || "未知错误"}`
      } else if (!response.player || typeof response.player !== "object") {
        apiFailureReply = `Hypixel 上没有找到玩家「${playerName}」`
      } else {
        data = response
        try {
          await fs.writeFile(cacheUrl, JSON.stringify(response, null, 2))
        } catch (error) {
          logger.error(`[Hypixel] 保存玩家缓存失败：${error}`)
        }
      }
    } catch (error) {
      apiFailure = error
    }

    if (apiFailure) {
      logger.error(`[Hypixel] 玩家数据查询失败：${apiFailure}`)
    } else if (apiFailureReply) {
      logger.error(`[Hypixel] ${apiFailureReply}`)
    }

    if (apiFailure || apiFailureReply) {
      data = await readCachedPlayer(cacheUrl)
      if (!data)
        return this.reply(
          apiFailureReply || getApiError(apiFailure, "Hypixel 玩家数据"),
        )
      logger.warn(`[Hypixel] Hypixel API 查询失败，改用缓存数据：${uuid}`)
    }

    const arcadeStats = data.player.stats?.Arcade
    const report = formatZombiesReport(data.player, arcadeStats, selection)
    if (!report)
      return this.reply(`${data.player.displayname || playerName} 暂无 ${selection.label} 数据`)

    return this.reply(report)
  }
}
