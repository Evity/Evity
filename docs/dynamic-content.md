# 主页数据接入

主页展示 GitHub、Steam、豆瓣收藏和 QQ 音乐听歌历史卡片。豆瓣已接入 Evity 的公开 RSS；QQ 音乐卡片已支持读取历史数据文件，登录授权与自动同步尚未接入。首页不再生成重复的数据详情。

## Steam：配置两个值即可

### 1. 申请 API Key

登录 [Steam Web API Key 页面](https://steamcommunity.com/dev/apikey)，按页面要求注册或查看已有 Key。这个项目使用 Steam 官方 Web API，不需要部署额外服务。

如果账号无法申请，先查看 [Steam 受限账户说明](https://help.steampowered.com/en/faqs/view/71D3-35C2-AD96-AA3A)：受限账户不能使用 Steam Web API。

### 2. 找到 SteamID64

需要的是 **17 位数字 ID**，不是登录名、昵称或好友代码。

如果个人主页地址是 `https://steamcommunity.com/profiles/76561198000000000`，末尾数字就是 ID。设置过自定义主页地址时，可按 [Steam 官方查找步骤](https://help.steampowered.com/en/faqs/view/2816-BE67-5B69-0FEC)，在「编辑个人资料」里查看自定义 URL 下方的数字地址；临时清空输入框查看即可，不用保存。

### 3. 允许读取游戏时长

在 Steam 的 **个人资料 → 编辑个人资料 → 隐私设置** 中：

- 将「游戏详情」设为「公开」。
- 取消「即使用户可以看到我的游戏详情，也始终保持我的总游戏时间私密」一类的勾选项。

[Steam 的隐私设置说明](https://store.steampowered.com/news/posts/?appids=593110&enddate=1528828991)指出，游戏详情和总游戏时间是可以分别隐藏的。单独标为私密的游戏也不会出现在近期记录里，见 [Steam 私密游戏说明](https://help.steampowered.com/en/faqs/view/1150-C06F-4D62-4966)。

### 4. 填入 GitHub Secrets

打开本仓库 **Settings → Secrets and variables → Actions → New repository secret**，添加：

| 名称 | 内容 |
| --- | --- |
| `STEAM_API_KEY` | 第一步取得的 Web API Key |
| `STEAM_ID` | 第二步取得的 17 位 SteamID64 |

Key 直接保存在 GitHub Secrets，不放进 README 或代码。GitHub 数据用工作流自带的 `GITHUB_TOKEN`，不用另申请个人 Token。

### 5. 运行工作流

代码需要位于仓库默认分支。在 **Actions → Refresh profile → Run workflow** 手动运行一次；如果 Actions 被禁用，先启用。成功后，工作流会提交新的 SVG 和 README 文字记录。之后每 6 小时更新一次。

Steam 数据来自官方 [GetRecentlyPlayedGames](https://partner.steamgames.com/doc/webapi/IPlayerService#GetRecentlyPlayedGames)：展示最近两周总时长，以及其中玩得最多的三个游戏。单个游戏同时显示累计时长。它不是实时在线状态，也不是整个账号的历史游戏总时长。

## 豆瓣：已接入公开收藏 RSS

使用你的[豆瓣个人主页](https://www.douban.com/people/Evity/)实际提供的[收藏 RSS](https://www.douban.com/feed/people/Evity/interests)，不需要 Key 或 Cookie。每次工作流刷新时读取最近三条，显示作品名、收藏状态、你的评价和收藏日期。

目前读到的最新三条是《007：大破天幕杀机》《小妇人》《教父3》。评价文字来自 RSS 中的个人推荐标签，不是豆瓣全站评分。卡片的更新时间是抓取时间，条目日期是收藏记录的发布时间。

该 feed 声明涵盖书、电影和音乐的收藏状态；当前账号返回的是电影。它不代表全部历史收藏。合法空 feed 显示暂无记录；请求失败、验证页面或无效 XML 显示暂时无法获取，不会编造作品。

## QQ 音乐：展示听歌历史，不读取歌单冒充历史

卡片读取 [data/qq-music-history.json](../data/qq-music-history.json)，保留最近听过的歌曲名和歌手。该文件是**公开展示数据**，不放 Cookie、登录 Token 或二维码信息。当前没有授权数据，默认显示“尚未接入听歌记录”。

取得自己的历史记录后，按最新在前的顺序写入，例如下面的字段格式（示意，不是你的听歌记录）：

```json
{
  "updatedAt": "2026-10-18T00:00:00Z",
  "songs": [
    { "title": "歌曲名", "artist": "歌手" }
  ]
}
```

卡片显示前三条；文件可保留更多记录。`updatedAt` 表示这份历史数据的采集时间，不会在没有新听歌数据时伪装为刚同步。只有 `updatedAt` 为 `null` 且 `songs` 为空才表示未接入；提供有效采集时间但没有歌曲时显示暂无记录。

目前未实现从 QQ 音乐账号自动抓取。经核实，腾讯[音乐服务 H5 SDK](https://cloud.tencent.com/document/product/1081/67456)的 `describeRecentPlay({ Type: 2, UpdateTime: 0 })` 能返回最近歌曲，但属于腾讯连连的平台接入场景，需要 QQ 音乐授权，最多返回近期 100 条，不能直接当成完整终身听歌历史。授权程序可将返回歌曲转换为上述公开文件；本项目不包含这个授权程序。

此前提到的 [jsososo/QQMusicApi](https://github.com/jsososo/QQMusicApi/blob/master/routes/user.js) 和 [L-1124/QQMusicApi](https://github.com/L-1124/QQMusicApi/tree/main/qqmusic_api/modules) 当前没有可直接使用的最近播放模块。歌单、收藏和听歌时长接口不能代替实际听歌历史，因此不为这张卡片配置虚假的 API Key 或歌单接口。

取得真实数据后可导入文件；要自动更新，还需要一个能合法读取你本人历史记录的授权数据源。

## 更新方式与排错

本地需要 Node.js 22 或更新版本：

```sh
npm run profile:update
npm run profile:check
# 仅刷新豆瓣和音乐卡片，保留当前 GitHub / Steam 图片
node scripts/update-profile.mjs --culture-only
```

- `profile:update` 读取公开 GitHub 和豆瓣数据、QQ 音乐历史文件，并按环境变量选择是否读取 Steam。
- `profile:check` 离线检查已有图片及 README 引用，不修改文件。
- GitHub 请求失败时，本次更新失败，保留上次快照。
- Steam 未配置、无公开数据、请求失败会分别显示对应状态，不会用 0 小时代替缺失数据。
- 已配置但没有游戏记录时，检查 `STEAM_ID`、游戏详情可见性、时长隐私设置，以及近两周是否有可公开的游戏。

图片有桌面和手机两套，共八张 SVG。`README.md` 中 `PROFILE:START` / `PROFILE:END` 之间只生成豆瓣与音乐卡片及豆瓣主页链接，不再输出统计详情或折叠区。其余介绍可手动修改；完整刷新会更新 GitHub、Steam 图片的替代文本。时长按接口分钟值换算为小时，保留一位小数。

修改 `data/qq-music-history.json` 会触发工作流更新。仅调整豆瓣或音乐内容时可用 `--culture-only`，避免本地缺少 Steam 凭证时把已有游戏卡片覆盖为未接入。

GitHub 的 Stars 统计自有、公开、非 Fork 仓库；近期项目再排除归档仓库。项目旁边的日期是该仓库的推送时间，不代表每次推送都由本人提交；卡片里的更新时间是本次数据采集时间。[GitHub 接口文档](https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user)

工作流为 `17 */6 * * *`（UTC）。GitHub 调度和图片缓存都可能带来延迟；定时任务长期未运行时可到 Actions 页面检查。旧 Spotify/Vercel 服务代码保留，新主页不使用它们。
