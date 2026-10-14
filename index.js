import fs from "node:fs/promises"
import YAML from "yaml"
import { getApiError, getPlayerStats, resolveUuid } from "./lib/api.js"
import { formatZombiesReport, getZombiesSelection } from "./lib/zombies.js"

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
    try {
      config = YAML.parse(await fs.readFile(new URL("./config.yaml", import.meta.url), "utf8"))
    } catch (error) {
      logger.error(`[Hypixel] 读取插件配置失败：${error}`)
      return this.reply("读取配置文件失败，请检查文件是否存在且格式正确")
    }
    const apiKey = config?.apiKey
    if (typeof apiKey !== "string" || !apiKey.trim())
      return this.reply("尚未配置 Hypixel API Key，请将密钥填写到 config.yaml 的 apiKey 项")

    let uuid
    let data
    try {
      uuid = await resolveUuid(playerName)
    } catch (error) {
      logger.error(`[Hypixel] 解析玩家 UUID 失败：${error}`)
      return this.reply(getApiError(error, "Minecraft 玩家查询"))
    }

    try {
      data = await getPlayerStats(uuid, apiKey.trim())
      fs.writeFile(new URL(`./cache/${uuid}.json`, import.meta.url), JSON.stringify(data, null, 2))
    } catch (error) {
      logger.error(`[Hypixel] 玩家数据查询失败：${error}`)
      return this.reply(getApiError(error, "Hypixel 玩家数据"))
    }

    if (!data.success) return this.reply(`Hypixel API 查询失败：${data.cause || "未知错误"}`)
    if (!data.player) return this.reply(`Hypixel 上没有找到玩家「${playerName}」`)

    const arcadeStats = data.player.stats?.Arcade
    const report = formatZombiesReport(data.player, arcadeStats, selection)
    if (!report)
      return this.reply(`${data.player.displayname || playerName} 暂无 ${selection.label} 数据`)

    return this.reply(report)
  }
}
