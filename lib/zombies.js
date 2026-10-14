const modes = {
  de: { name: "穷途末路", tokens: ["dead", "end"] },
  bb: { name: "坏血之宫", tokens: ["bad", "blood"] },
  aa: { name: "外星游乐园", globalDifficulties: ["n"], tokens: ["alien", "arcadium"] },
  pr: { name: "监狱风云", globalName: "监狱", tokens: ["prison"] },
}

const difficulties = {
  n: { name: "普通", token: "normal" },
  h: { name: "Hard", token: "hard" },
  r: { name: "RIP", token: "rip" },
}

const aliases = Object.fromEntries([
  ...Object.entries(modes).map(([alias, mode]) => [alias, { mode, difficulty: undefined }]),
  ...Object.entries(modes).flatMap(([modeAlias, mode]) =>
    Object.entries(difficulties).map(([difficultyAlias, difficulty]) => [
      `${modeAlias}${difficultyAlias}`,
      { mode, difficulty },
    ]),
  ),
])

const summaryMetrics = [
  ["total_rounds_survived", "生存总回合数"],
  ["wins", "胜场"],
  ["best_round", "最佳回合"],
  ["zombie_kills", "僵尸击杀数"],
  ["players_revived", "复活玩家数"],
  ["doors_opened", "开门数"],
  ["windows_repaired", "窗户修复数"],
  ["times_knocked_down", "被击倒次数"],
  ["deaths", "死亡数"],
]

const timedRounds = [
  ["fastest_time_10", "第 10 回合最快完成时间"],
  ["fastest_time_20", "第 20 回合最快完成时间"],
  ["fastest_time_30", "第 30 回合最快完成时间"],
]

const metricLabels = new Map([...summaryMetrics, ...timedRounds])

const specialKills = [
  ["bomb_zombie_kills_zombies", "炸弹僵尸击杀", "de"],
  ["inferno_zombie_kills_zombies", "炼狱击杀", "de"],
  ["broodmother_zombie_kills_zombies", "巢穴之母击杀", "de"],
  ["giant_zombie_kills_zombies", "巨人击杀", "aa"],
  ["giant_rainbow_zombie_kills_zombies", "彩虹巨人击杀", "aa"],
  ["the_old_one_zombie_kills_zombies", "长者击杀", "aa"],
  ["world_destroyer_zombie_kills_zombies", "世界毁灭者击杀", "aa"],
  ["king_slime_zombie_kills_zombies", "史莱姆王击杀", "bb"],
  ["wither_zombie_kills_zombies", "凋零击杀", "bb"],
  ["herobrine_zombie_kills_zombies", "幽影之王击杀", "bb"],
  ["prisoner_zombie_angry_zombie_kills_zombies", "愤怒囚犯击杀", "pr"],
  ["corrupted_pigman_zombie_kills_zombies", "腐化猪灵击杀", "pr"],
  ["the_warden_zombie_kills_zombies", "监狱长击杀", "pr"],
]

const rankNames = {
  VIP: "VIP",
  VIP_PLUS: "VIP+",
  MVP: "MVP",
  MVP_PLUS: "MVP+",
  SUPERSTAR: "MVP++",
  YOUTUBER: "YouTube",
  ADMIN: "ADMIN",
  MODERATOR: "MOD",
  HELPER: "HELPER",
}

function matchesMode(tokens, mode) {
  return tokens.includes(mode.tokens.join("")) || mode.tokens.every(token => tokens.includes(token))
}

export function getZombiesSelection(alias) {
  if (alias && !(alias in aliases)) return null

  const selected = aliases[alias]
  if (!selected) {
    return {
      mode: undefined,
      difficulty: undefined,
      label: "综合数据",
    }
  }

  return {
    ...selected,
    label: selected.difficulty
      ? `${selected.mode.name} - ${selected.difficulty.name}`
      : selected.mode.name,
  }
}

function formatCount(value) {
  return new Intl.NumberFormat("en-US").format(Number(value))
}

function formatDuration(seconds) {
  const totalSeconds = Math.floor(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60
  return [hours, minutes, remainingSeconds].map(value => String(value).padStart(2, "0")).join(":")
}

function getRank(player) {
  const candidates = [
    player.monthlyPackageRank === "SUPERSTAR" ? "SUPERSTAR" : undefined,
    player.rank,
    player.newPackageRank,
    player.packageRank,
    player.monthlyPackageRank,
  ]

  for (const rank of candidates)
    if (rank && rank !== "NORMAL" && rank !== "NONE")
      return rankNames[rank] || rank.replaceAll("_", " ")

  return undefined
}

function getPercent(numerator, denominator) {
  if (
    typeof numerator !== "number" ||
    !Number.isFinite(numerator) ||
    typeof denominator !== "number" ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  )
    return undefined

  return `${((numerator / denominator) * 100).toFixed(1)}%`
}

function getGlobalMapLine(stats, mode) {
  const modeToken = mode.tokens.join("")
  const modeDifficulties = mode.globalDifficulties || Object.keys(difficulties)
  const results = modeDifficulties
    .map(key => difficulties[key])
    .map(difficulty => {
      const suffix = `zombies_${modeToken}_${difficulty.token}`
      const wins = stats[`wins_${suffix}`]
      if (typeof wins === "number" && Number.isFinite(wins) && wins > 0)
        return formatCount(wins)

      const bestRound = stats[`best_round_${suffix}`]
      if (typeof bestRound === "number" && Number.isFinite(bestRound) && bestRound > 0)
        return `[${formatCount(bestRound)}]`

      return "0"
    })

  return `| ${mode.globalName || mode.name}: ${results.join("/")}`
}

function formatGlobalReport(player, stats) {
  const rank = getRank(player)
  const playerLine = `${rank ? `[${rank}] ` : ""}${player.displayname || player.playername}`

  const totalRounds = stats.total_rounds_survived_zombies
  const wins = stats.wins_zombies
  const hitRate = getPercent(stats.bullets_hit_zombies, stats.bullets_shot_zombies) || "0.0%"
  const headshotRate = getPercent(stats.headshots_zombies, stats.bullets_hit_zombies) || "0.0%"
  const lines = [
    `| 生存总回合: ${typeof totalRounds === "number" && Number.isFinite(totalRounds) ? formatCount(totalRounds) : "0"}`,
    `| 胜场: ${typeof wins === "number" && Number.isFinite(wins) ? formatCount(wins) : "0"}`,
    `| 命中率: ${hitRate}`,
    `| 爆头率: ${headshotRate}`,
    ...timedRounds.map(([metric, label]) => {
      const time = stats[`${metric}_zombies`]
      const formattedTime =
        typeof time === "number" && Number.isFinite(time) ? formatDuration(time) : "00:00:00"
      return `| 全局${label}: ${formattedTime}`
    }),
    "| 胜场或最佳回合 (普通/困难/安息)",
  ]

  for (const mode of Object.values(modes)) {
    const line = getGlobalMapLine(stats, mode)
    lines.push(line)
  }

  return ["===僵尸末日全局信息===", playerLine, ...lines].join("\n")
}

function getMapLines(stats, mode, difficulty) {
  const modeToken = mode.tokens.join("")
  const difficultyToken = difficulty?.token
  const suffix = `zombies_${modeToken}${difficultyToken ? `_${difficultyToken}` : ""}`
  const metricOrder = new Map(
    [...summaryMetrics, ...timedRounds].map(([metric], index) => [metric, index]),
  )
  const entries = Object.entries(stats)
    .flatMap(([key, value]) => {
      if (!key.endsWith(`_${suffix}`)) return []
      if (typeof value !== "number" || !Number.isFinite(value)) return []

      const metric = key.slice(0, -suffix.length - 1)
      if (metric !== "zombie_kills" && metric.includes("kill")) return []
      return [[metric, value]]
    })
    .sort(([first], [second]) => {
      const firstOrder = metricOrder.get(first) ?? Number.MAX_SAFE_INTEGER
      const secondOrder = metricOrder.get(second) ?? Number.MAX_SAFE_INTEGER
      return firstOrder - secondOrder || first.localeCompare(second)
    })

  return entries.map(([metric, value]) => {
    const label = metricLabels.get(metric) || `其他统计（${metric.replaceAll("_", " ")}）`
    const formattedValue = timedRounds.some(([timedMetric]) => timedMetric === metric)
      ? formatDuration(value)
      : formatCount(value)
    return `| ${label}: ${formattedValue}`
  })
}

function getSpecialKillsByMode(stats) {
  return Object.fromEntries(
    Object.entries(modes).map(([modeAlias, mode]) => [
      mode.name,
      specialKills
        .map(([key, label, statModeAlias]) => {
          if (statModeAlias !== modeAlias) return null
          const counts = (Array.isArray(key) ? key : [key])
            .map(statKey => stats[statKey])
            .filter(count => typeof count === "number" && Number.isFinite(count))
          if (!counts.length) return null
          const value = counts.reduce((total, count) => total + count, 0)
          if (typeof value !== "number" || !Number.isFinite(value)) return null
          return `${label}: ${formatCount(value)}`
        })
        .filter(Boolean),
    ]),
  )
}

export function formatZombiesReport(player, stats, selection) {
  if (!stats || typeof stats !== "object") return null
  if (!selection.mode) return formatGlobalReport(player, stats)

  const specialKillsByMode = getSpecialKillsByMode(stats)
  const selectedModes = selection.mode
    ? [[selection.mode, selection.difficulty]]
    : Object.values(modes).map(mode => [mode, undefined])
  const sections = selectedModes
    .map(([mode, difficulty]) => {
      const lines = getMapLines(stats, mode, difficulty)
      const specialLines = specialKillsByMode[mode.name] || []
      if (!lines.length && !specialLines.length) return null
      if (specialLines.length)
        lines.push(specialLines.slice(0, 2).join(" | "), ...specialLines.slice(2))
      return [`| 地图: ${mode.name}`, ...lines].join("\n")
    })
    .filter(Boolean)

  if (!sections.length) return null

  const rank = getRank(player)
  const playerLine = `${rank ? `[${rank}] ` : ""}${player.displayname || player.playername}`
  return ["===僵尸末日信息===", playerLine, ...sections].join("\n")
}
