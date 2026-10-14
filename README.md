# Hypixel 查询插件

查询 Minecraft 玩家在 Hypixel 僵尸末日（Zombies）中的数据。

## 安装与配置

在云崽根目录下打开终端，运行：

* 使用 Github

``` bash
git clone --depth=1 https://github.com/Kwisma/Hypixel-Plugin.git ./plugins/Hypixel-Plugin/
```

1. 将 `hypixel-plugin` 放入 Yunzai 的 `plugins` 目录。
2. 在 [Hypixel Developer Dashboard](https://developer.hypixel.net/) 创建并获取 API Key。
3. 将 API Key 填入插件目录下的 `config.yaml`：

   ```yaml
   apiKey: "替换为你的 Hypixel API Key"
   ```

4. 重启 Yunzai 或重新加载插件。

请勿将 API Key 分享给他人或提交到公开仓库。

## 使用方法

```text
#hyp <玩家名或UUID> zb [模式/难度]
#hypixel <玩家名或UUID> zb [模式/难度]
```

`zb` 表示查询僵尸末日数据。模式和难度参数可省略；省略时显示全局简要数据、命中率/爆头率、全局第 10、20、30 回合最快通关时间，以及各地图的胜场或最佳回合（方括号表示最佳回合）。穷途末路、坏血之宫和监狱风云显示普通/困难/RIP三种难度；外星游乐园只显示单一难度。

| 地图 | 模式代码 | 难度代码 |
| --- | --- | --- |
| 穷途末路（Dead End） | `de` | `den` 普通、`deh` Hard、`der` RIP |
| 坏血之宫（Bad Blood） | `bb` | `bbn` 普通、`bbh` Hard、`bbr` RIP |
| 外星游乐园（Alien Arcadium） | `aa` | `aan` 普通、`aah` Hard、`aar` RIP |
| 监狱风云（Prison） | `pr` | `prn` 普通、`prh` Hard、`prr` RIP |

示例：

```text
#hyp Notch zb
#hyp Notch zb de
#hyp Notch zb prn
#hyp 069a79f444e94726a5befca90e38aaf5 zb aa
```

## 报告内容

指定地图或难度时，报告显示 API 提供的地图专属数值统计，包括生存总回合数、胜场、最佳回合、僵尸击杀数、复活玩家数、开门数、窗户修复数、被击倒次数、死亡数，以及以时:分:秒格式显示的第 10、20、30 回合最快完成时间。选择难度时只显示该难度字段；查询地图但不指定难度时只显示不带难度后缀的综合字段，不跨难度累加。地图 Boss 击杀统计仍按地图显示：

- **穷途末路**：炸弹僵尸、Inferno（炼狱）、巢穴之母
- **坏血之宫**：史莱姆王、凋零、幽影之王
- **外星游乐园**：巨人、彩虹巨人、长者、世界毁灭者
- **监狱风云**：愤怒囚犯、腐化猪灵、监狱长

## 数据来源

玩家名称会先通过 Minecraft Services 查询 UUID，再使用配置的 API Key 请求 Hypixel Player API。每次命令都会实时请求 API，并将成功的数据缓存到插件的 `cache` 目录。若该目录不存在会自动创建；Hypixel API 查询失败时会尝试读取该玩家的缓存数据。首次运行且缺少 `config.yaml` 时会自动创建空 API Key 配置文件，填写 API Key 后即可使用。若请求失败且没有可用缓存，机器人会返回相应错误提示。
